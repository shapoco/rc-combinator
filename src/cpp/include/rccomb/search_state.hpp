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
  const TopologyNode node;
  SearchState parent = nullptr;
  SearchState first_child = nullptr;
  SearchState next_brother = nullptr;
  bool inv_sum;
  value_t value = 0;
  value_t min = 0;
  value_t max = VALUE_POSITIVE_INFINITY;

  SearchStateClass(const TopologyNode& node, bool inv_sum)
      : id(generate_object_id()), node(node), inv_sum(inv_sum) {}

  inline bool is_leaf() const { return !first_child; }
  inline bool is_younguest() const { return !next_brother; }
  inline bool is_root() const { return !parent; }

  value_t sum(uint32_t end_id = 0) const;
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
          s += node->parallel ? "||" : "--";
        }
        child = child->next_brother;
      }
      s += "==>" + std::to_string(value);
      return s;
    }
  }
#endif
};

static inline SearchState create_search_state(const TopologyNode& node,
                                              bool inv_sum) {
  return std::make_shared<SearchStateClass>(node, inv_sum);
}

SearchState build_search_state_tree(ComponentType type,
                                    std::vector<SearchState>& leafs,
                                    TopologyNode node);

#ifdef RCCOMB_IMPLEMENTATION

// トポロジの木から検索用作業オブジェクトの木を生成
SearchState build_search_state_tree(ComponentType type,
                                    std::vector<SearchState>& leafs,
                                    TopologyNode node) {
  bool inv_sum;
  if (type == ComponentType::Resistor) {
    inv_sum = node->parallel;
  } else {
    inv_sum = !node->parallel;
  }

  SearchState st = create_search_state(node, inv_sum);

  if (node->is_leaf()) {
    leafs.push_back(st);
  } else {
    SearchState prev_brother = nullptr;
    for (const auto& child_node : node->children) {
      auto child_st = build_search_state_tree(type, leafs, child_node);
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

value_t SearchStateClass::sum(uint32_t end_id) const {
  value_t accum = 0;
  auto child = this->first_child;
  while (child) {
    if (inv_sum) {
      accum += 1.0 / child->value;
    } else {
      accum += child->value;
    }
    if (child->id == end_id) {
      break;
    }
    child = child->next_brother;
  }
  return inv_sum ? (1.0 / accum) : accum;
}

void SearchStateClass::update_min_max(value_t min, value_t max) {
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
  return create_combination(this->node, type, child_combs, this->value);
}

#endif

}  // namespace rccomb

#endif
