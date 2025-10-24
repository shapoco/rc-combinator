#ifndef RCCOMB_TOPOLOGY_HPP
#define RCCOMB_TOPOLOGY_HPP

#include <cstdint>
#include <map>
#include <memory>
#include <vector>

#include "rccomb/common.hpp"

namespace rccomb {

class TopologyNodeClass;
using TopologyNode = std::shared_ptr<TopologyNodeClass>;

class TopologyNodeClass {
 public:
  static constexpr uint32_t POLY = 0xEDB88320;

  const bool parallel;
  const std::vector<TopologyNode> children;
  const int num_leafs;
  const hash_t hash;

 private:
  inline static int count_leafs(const std::vector<TopologyNode>& children) {
    if (children.empty()) {
      return 1;
    } else {
      int total = 0;
      for (const auto& child : children) {
        total += child->num_leafs;
      }
      return total;
    }
  }

  inline static hash_t compute_hash(bool parallel,
                                    const std::vector<TopologyNode>& children) {
    hash_t h = 0x12345678;
    if (!children.empty()) {
      if (parallel) {
        h = crc32_add_u32(h, 0xF0F0F0F0);
      } else {
        h = crc32_add_u32(h, 0x0F0F0F0F);
      }
      for (const auto& child : children) {
        h = crc32_add_u32(h, child->hash);
      }
    }
    return h;
  }

 public:
  TopologyNodeClass(bool parallel, const std::vector<TopologyNode>& children)
      : parallel(parallel),
        children(children),
        num_leafs(count_leafs(children)),
        hash(compute_hash(parallel, children)) {}

  inline bool is_leaf() const { return num_leafs == 1; }

#ifdef RCCOMB_DEBUG
  inline std::string to_string() const {
    if (is_leaf()) {
      return "Leaf";
    } else {
      std::string s;
      for (size_t i = 0; i < children.size(); i++) {
        if (children[i]->is_leaf()) {
          s += children[i]->to_string();
        } else {
          s += "(" + children[i]->to_string() + ")";
        }
        if (i + 1 < children.size()) {
          s += parallel ? "||" : "--";
        }
      }
      return s;
    }
  }
#endif
};

static inline TopologyNode create_topology_node(
    bool parallel, const std::vector<TopologyNode>& children) {
  return std::make_shared<TopologyNodeClass>(parallel, children);
}

std::vector<TopologyNode>& get_topologies(int num_leafs, bool parallel);

#ifdef RCCOMB_IMPLEMENTATION

// ノード分割のコンテキスト
struct NodeDivideContext {
  const bool parallel;
  std::vector<int> part_sizes;
  std::vector<TopologyNode> nodes;
};

// トポロジのキャッシュ
std::map<int, std::vector<TopologyNode>> cache;

static void split_children_recursive(NodeDivideContext& ctx, int num_parts,
                                     int leafs_remaining);
static void collect_children(NodeDivideContext& ctx, int num_parts);

// num_children個の子ノードを持つ全トポロジーを取得
std::vector<TopologyNode>& get_topologies(int num_leafs, bool parallel) {
  const uint32_t key = num_leafs + ((num_leafs >= 2 && parallel) ? 1000 : 0);

  if (!cache.contains(key)) {
    if (num_leafs == 1) {
      // 葉ノードの生成
      const auto leaf =
          create_topology_node(parallel, std::vector<TopologyNode>{});
      const std::vector<TopologyNode> nodes = {leaf};
      cache[key] = nodes;
    } else if (num_leafs > 1) {
      // 子ノードを再帰的に分割
      std::vector<TopologyNode> nodes;
      NodeDivideContext ctx{
          .parallel = parallel,
          .part_sizes = std::vector<int>(num_leafs, 0),
          .nodes = nodes,
      };
      split_children_recursive(ctx, 0, num_leafs);
      cache[key] = ctx.nodes;
    } else {
      throw std::runtime_error("num_leafs must be >= 1");
    }

#ifdef RCCOMB_DEBUG
    for (const auto& topo : cache[key]) {
      RCCOMB_DEBUG_PRINT("new topology: %s\n", topo->to_string().c_str());
    }
#endif
  }

  return cache[key];
}

static void split_children_recursive(NodeDivideContext& ctx, int num_parts,
                                     int leafs_remaining) {
  if (leafs_remaining == 0) {
    // 分割終了 --> 子ノード生成
    collect_children(ctx, num_parts);
  } else {
    // 残りの子要素を分割
    int wMax = leafs_remaining;
    if (num_parts == 0) {
      // 初回は最低でも2分割
      wMax = leafs_remaining - 1;
    } else if (ctx.part_sizes[num_parts - 1] < wMax) {
      // 前の兄弟の大きさ以下に分割 (重複回避)
      wMax = ctx.part_sizes[num_parts - 1];
    }

    // あり得る分割サイズを全部試す
    for (int w = 1; w <= wMax; w++) {
      ctx.part_sizes[num_parts] = w;
      split_children_recursive(ctx, num_parts + 1, leafs_remaining - w);
    }
  }
}

static void collect_children(NodeDivideContext& ctx, int num_parts) {
  if (num_parts == 0) return;

  // 孫ノードを収集
  std::vector<std::vector<TopologyNode>> parts;
  for (int i = 0; i < num_parts; i++) {
    parts.push_back(get_topologies(ctx.part_sizes[i], !ctx.parallel));
  }

  // 孫ノードを総当たりで組み合わせて子ノードを生成
  std::vector<int> indices(num_parts, 0);
  while (indices[num_parts - 1] <
         static_cast<int>(parts[num_parts - 1].size())) {
    // 子ノードを生成
    std::vector<TopologyNode> children(num_parts);
    for (int i = 0; i < num_parts; i++) {
      children[i] = parts[i][indices[i]];
    }
    const auto node = create_topology_node(ctx.parallel, children);
    ctx.nodes.push_back(node);

    // インデックスをインクリメント
    for (int i = 0; i < num_parts; i++) {
      indices[i]++;
      if (indices[i] < static_cast<int>(parts[i].size())) {
        break;
      } else if (i + 1 >= num_parts) {
        break;
      } else {
        indices[i] = 0;
      }
    }
  }
}

#endif

}  // namespace rccomb

#endif
