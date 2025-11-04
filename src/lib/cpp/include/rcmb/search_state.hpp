#ifndef RCMB_SEARCH_STATE_HPP
#define RCMB_SEARCH_STATE_HPP

#include <cstdint>
#include <map>
#include <memory>
#include <stack>
#include <vector>

#include "rcmb/combination.hpp"
#include "rcmb/common.hpp"
#include "rcmb/topology.hpp"

namespace rcmb {

extern uint32_t num_search_states;

class SearchStateClass;
using SearchState = std::shared_ptr<SearchStateClass>;

class SearchStateClass {
 public:
  const uint32_t id;
  const Topology& topology;
  bool inv_sum;
  const bool is_finisher;

  SearchState parent = nullptr;
  SearchState first_child = nullptr;
  SearchState prev_brother = nullptr;
  SearchState next_brother = nullptr;

  value_t accum = 0;
  value_t value = 0;
  value_t target = VALUE_NONE;
  value_t min = 0;
  value_t max = VALUE_POSITIVE_INFINITY;

  SearchStateClass(const Topology& topo, bool inv_sum, bool is_finisher)
      : id(generate_object_id()),
        topology(topo),
        inv_sum(inv_sum),
        is_finisher(is_finisher) {
    num_search_states++;
  }

  ~SearchStateClass() {
    num_search_states--;
  }

  inline void unlink() {
    if (first_child) {
      first_child->parent = nullptr;
      first_child->unlink();
      first_child = nullptr;
    }
    if (next_brother) {
      next_brother->prev_brother = nullptr;
      next_brother->unlink();
      next_brother = nullptr;
    }
    parent = nullptr;
  }

  inline bool is_leaf() const { return !first_child; }
  inline bool is_first_child() const { return !prev_brother; }
  inline bool is_last_child() const { return !next_brother; }
  inline bool is_root() const { return !parent; }

  void update_min_max(value_t min, value_t max);

  Combination bake(ComponentType type) const;
  std::string to_string() const;
};

static inline SearchState create_search_state(const Topology& topo,
                                              bool inv_sum, bool is_finisher) {
  return std::make_shared<SearchStateClass>(topo, inv_sum, is_finisher);
}

SearchState build_search_state_tree(ComponentType type,
                                    std::vector<SearchState>& leafs,
                                    Topology& node, bool is_finisher = true);

#ifdef RCMB_IMPLEMENTATION

uint32_t num_search_states = 0;

// このノードとその長男ノードに再帰的に min/max を設定
void SearchStateClass::update_min_max(value_t min, value_t max) {
  if (min <= 0) min = 0;
  if (max <= 0) max = 0;
  if (max < min) max = min;

  SearchStateClass* st = this;

  min -= min / 1e9;
  max += max / 1e9;

  while (st) {
    st->min = min;
    st->max = max;
    if (st->inv_sum) {
      max = VALUE_POSITIVE_INFINITY;
    } else {
      min = 0;
    }
    st = st->first_child.get();
  }
}

// 検索結果を Combination に変換
Combination SearchStateClass::bake(ComponentType type) const {
  std::vector<Combination> child_combs;
  auto child = this->first_child;
  while (child) {
    child_combs.emplace_back(child->bake(type));
    child = child->next_brother;
  }
  return create_combination(this->topology, type, std::move(child_combs),
                            this->value);
}

std::string SearchStateClass::to_string() const {
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
        s += topology->parallel ? "//" : "--";
      }
      child = child->next_brother;
    }
    s += "==>" + std::to_string(value);
    return s;
  }
}

// トポロジの木から検索用作業オブジェクトの木を生成
SearchState build_search_state_tree(ComponentType type,
                                    std::vector<SearchState>& leafs,
                                    Topology& topology, bool is_finisher) {
  bool inv_sum;
  if (type == ComponentType::Resistor) {
    inv_sum = topology->parallel;
  } else {
    inv_sum = !topology->parallel;
  }

  SearchState st = create_search_state(topology, inv_sum, is_finisher);

  if (topology->is_leaf()) {
    leafs.push_back(st);
  } else {
    SearchState prev_brother = nullptr;
    for (size_t i = 0; i < topology->children.size(); i++) {
      auto& child_topology = topology->children[i];
      bool is_last = (i + 1 >= topology->children.size());
      auto child_st = build_search_state_tree(type, leafs, child_topology,
                                              is_finisher && is_last);
      child_st->parent = st;

      if (!st->first_child) {
        st->first_child = child_st;
      }

      if (prev_brother) {
        prev_brother->next_brother = child_st;
        child_st->prev_brother = prev_brother;
      }
      prev_brother = child_st;
    }
  }

  return st;
}

#endif

}  // namespace rcmb

#endif
