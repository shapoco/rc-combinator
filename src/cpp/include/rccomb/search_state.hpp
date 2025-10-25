#ifndef RCCOMB_SEARCH_STATE_HPP
#define RCCOMB_SEARCH_STATE_HPP

#include <cstdint>
#include <map>
#include <memory>
#include <stack>
#include <vector>

#include "rccomb/combination.hpp"
#include "rccomb/common.hpp"
#include "rccomb/topology_node.hpp"

namespace rccomb {

class SearchStateClass;
using SearchState = std::shared_ptr<SearchStateClass>;

class SearchStateClass {
 public:
  const uint32_t id;
  const TopologyNode topology;
  bool inv_sum;
  const bool is_finisher;

  SearchState parent = nullptr;
  SearchState first_child = nullptr;
  SearchState next_brother = nullptr;

  value_t value = 0;
  value_t target = VALUE_NONE;
  value_t min = 0;
  value_t max = VALUE_POSITIVE_INFINITY;

  SearchStateClass(const TopologyNode& topo, bool inv_sum, bool is_finisher)
      : id(generate_object_id()),
        topology(topo),
        inv_sum(inv_sum),
        is_finisher(is_finisher) {}

  inline bool is_leaf() const { return !first_child; }
  inline bool is_last_child() const { return !next_brother; }
  inline bool is_root() const { return !parent; }

  inline value_t sum() const { return partial_sum(0, false); }
  value_t partial_sum(uint32_t end_id, bool end_exclusive) const;
  void update_min_max(value_t min, value_t max);

  Combination bake(ComponentType type) const;

#ifdef RCCOMB_DEBUG
  inline std::string to_string() const {
    if (is_leaf()) {
      return std::to_string(value);
    } else {
      std::string s;
      auto child = first_child;
      while (child) {
        if (child->is_leaf()) {
          s += child->to_string();
        } else {
          s += "(" + child->to_string() + ")";
        }
        if (child->next_brother) {
          s += topology->parallel ? "||" : "--";
        }
        child = child->next_brother;
      }
      s += "==>" + std::to_string(value);
      return s;
    }
  }
#endif
};

static inline SearchState create_search_state(const TopologyNode& topo,
                                              bool inv_sum, bool is_finisher) {
  return std::make_shared<SearchStateClass>(topo, inv_sum, is_finisher);
}

SearchState build_search_state_tree(ComponentType type,
                                    std::vector<SearchState>& leafs,
                                    TopologyNode node, bool is_finisher = true);

#ifdef RCCOMB_IMPLEMENTATION

// トポロジの木から検索用作業オブジェクトの木を生成
SearchState build_search_state_tree(ComponentType type,
                                    std::vector<SearchState>& leafs,
                                    TopologyNode node, bool is_finisher) {
  bool inv_sum;
  if (type == ComponentType::Resistor) {
    inv_sum = node->parallel;
  } else {
    inv_sum = !node->parallel;
  }

  SearchState st = create_search_state(node, inv_sum, is_finisher);

  if (node->is_leaf()) {
    leafs.push_back(st);
  } else {
    SearchState prev_brother = nullptr;
    for (size_t i = 0; i < node->children.size(); i++) {
      auto child_node = node->children[i];
      bool is_last = (i + 1 >= node->children.size());
      auto child_st = build_search_state_tree(type, leafs, child_node,
                                              is_finisher && is_last);
      child_st->parent = st;

      if (!st->first_child) {
        st->first_child = child_st;
      }

      if (prev_brother) {
        prev_brother->next_brother = child_st;
      }
      prev_brother = child_st;
    }
  }

  return st;
}

value_t SearchStateClass::partial_sum(uint32_t end_id,
                                      bool end_exclusive) const {
  value_t accum = 0;
  auto child = this->first_child;
  while (child) {
    if (end_exclusive && child->id == end_id) {
      break;
    }
    if (inv_sum) {
      accum += 1.0 / child->value;
    } else {
      accum += child->value;
    }
    if (!end_exclusive && child->id == end_id) {
      break;
    }
    child = child->next_brother;
  }
  return inv_sum ? (1.0 / accum) : accum;
}

// このノードと長男ノードに再帰的に min/max を設定
void SearchStateClass::update_min_max(value_t min, value_t max) {
  if (min <= 0) min = 0;
  if (max <= 0) max = 0;
  if (max < min) max = min;

  this->min = min;
  this->max = max;

  const auto child = this->first_child;
  if (child) {
    value_t child_min = 0;
    value_t child_max = VALUE_POSITIVE_INFINITY;
    if (inv_sum) {
      child_min = min;
    } else {
      child_max = max;
    }
    child->update_min_max(child_min, child_max);
  }
}

// 検索結果を Combination に変換
Combination SearchStateClass::bake(ComponentType type) const {
  std::vector<Combination> child_combs;
  auto child = this->first_child;
  while (child) {
    child_combs.push_back(child->bake(type));
    child = child->next_brother;
  }
  return create_combination(this->topology, type, child_combs, this->value);
}

#endif

}  // namespace rccomb

#endif
