#ifndef RCCOMB_TOPOLOGY_HPP
#define RCCOMB_TOPOLOGY_HPP

#include <cstdint>
#include <map>
#include <memory>
#include <vector>

#include "rcmb/common.hpp"

namespace rcmb {

class TopologyClass;
using Topology = std::shared_ptr<TopologyClass>;

class TopologyClass {
 public:
  static constexpr uint32_t POLY = 0xEDB88320;

  const bool parallel;
  const std::vector<Topology> children;
  const int num_leafs;
  const int depth;
  const uint32_t id;

 private:
  inline static int count_leafs(const std::vector<Topology>& children) {
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

  inline static int count_depth(const std::vector<Topology>& children) {
    if (children.empty()) {
      return 0;
    } else {
      int max = 0;
      for (const auto& child : children) {
        if (max < child->depth) {
          max = child->depth;
        }
      }
      return max + 1;
    }
  }

  // inline static hash_t compute_hash(bool parallel,
  //                                   const std::vector<Topology>& children) {
  //   hash_t h = 0x12345678;
  //   if (!children.empty()) {
  //     if (parallel) {
  //       h = crc32_add_u32(h, 0xF0F0F0F0);
  //     } else {
  //       h = crc32_add_u32(h, 0x0F0F0F0F);
  //     }
  //     for (const auto& child : children) {
  //       h = crc32_add_u32(h, child->hash);
  //     }
  //   }
  //   return h;
  // }

 public:
  TopologyClass(bool parallel, const std::vector<Topology>& children)
      : parallel(parallel),
        children(children),
        num_leafs(count_leafs(children)),
        depth(count_depth(children)),
        id(generate_object_id()) {}

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
          s += parallel ? "//" : "--";
        }
      }
      return s;
    }
  }
#endif
};

static inline Topology create_topology_node(
    bool parallel, const std::vector<Topology>& children) {
  return std::make_shared<TopologyClass>(parallel, children);
}

std::vector<Topology>& get_topologies(int num_leafs, bool parallel);

#ifdef RCCOMB_IMPLEMENTATION

// ノード分割のコンテキスト
struct NodeDivideContext {
  const bool parallel;
  std::vector<int> part_sizes;
  std::vector<Topology> nodes;
};

// トポロジのキャッシュ
std::map<int, std::vector<Topology>> cache;

static void split_children_recursive(NodeDivideContext& ctx, int num_parts,
                                     int leafs_remaining);
static void collect_children(NodeDivideContext& ctx, int num_parts);

// num_children個の子ノードを持つ全トポロジーを取得
std::vector<Topology>& get_topologies(int num_leafs, bool parallel) {
  const uint32_t key = num_leafs + ((num_leafs >= 2 && parallel) ? 1000 : 0);

  if (!cache.contains(key)) {
    if (num_leafs == 1) {
      // 葉ノードの生成
      const auto leaf = create_topology_node(parallel, std::vector<Topology>{});
      const std::vector<Topology> nodes = {leaf};
      cache[key] = nodes;
    } else if (num_leafs > 1) {
      // 子ノードを再帰的に分割
      std::vector<Topology> nodes;
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
    // for (const auto& topo : cache[key]) {
    //   RCCOMB_DEBUG_PRINT("new topology: %s\n", topo->to_string().c_str());
    // }
    RCCOMB_DEBUG_PRINT("Generated %d topologies for n=%d, parallel=%d\n",
                       static_cast<int>(cache[key].size()), num_leafs,
                       parallel ? 1 : 0);
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
  std::vector<std::vector<Topology>> parts;
  for (int i = 0; i < num_parts; i++) {
    parts.push_back(get_topologies(ctx.part_sizes[i], !ctx.parallel));
  }

  // 孫ノードを総当たりで組み合わせて子ノードを生成
  std::vector<size_t> indices(num_parts, 0);
  while (indices[num_parts - 1] < parts[num_parts - 1].size()) {
    // 子ノードを生成
    int last_num_leafs = -1;
    uint32_t last_id = 0;
    bool skip = false;
    std::vector<Topology> children(num_parts);
    for (int i = 0; i < num_parts; i++) {
      auto child = parts[i][indices[i]];
      if (child->num_leafs == last_num_leafs && child->id > last_id) {
        // 重複回避: 葉の数が同じ子ノードは ID が同じか降順の場合のみ許可
        skip = true;
        break;
      }
      last_num_leafs = child->num_leafs;
      last_id = child->id;
      children[i] = child;
    }
    if (!skip) {
      const auto node = create_topology_node(ctx.parallel, children);
      ctx.nodes.push_back(node);
    }

    // インデックスをインクリメント
    for (int i = 0; i < num_parts; i++) {
      indices[i]++;
      if (indices[i] < parts[i].size()) {
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

}  // namespace rcmb

#endif
