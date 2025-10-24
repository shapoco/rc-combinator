#ifndef RCCOMB_RCCOMB_HPP
#define RCCOMB_RCCOMB_HPP

#include <cmath>
#include <limits>
#include <stack>
#include <vector>

#include "rccomb/combination.hpp"
#include "rccomb/common.hpp"
#include "rccomb/search_state.hpp"
#include "rccomb/topology_node.hpp"
#include "rccomb/value_list.hpp"

namespace rccomb {

struct ValueSearchOptions {
  const ComponentType type;
  const ValueList available_values;
  const value_t min_value;
  const value_t max_value;
  int max_elements;
  const value_t target;

  ValueSearchOptions(ComponentType type, const ValueList& values,
                     value_t min_val, value_t max_val, int max_elems,
                     value_t target = VALUE_NONE)
      : type(type),
        available_values(values),
        min_value(min_val),
        max_value(max_val),
        max_elements(max_elems),
        target(target) {}
};

std::vector<Combination> search_combinations(ValueSearchOptions& options);

#ifdef RCCOMB_IMPLEMENTATION

struct ValueSearchContext;

// using value_search_callback_t = void (*)(void* ctx, value_t value);

// struct ValueSearchState {
//   TopologyNode node;
//   int i_child;
//   value_t min_value;
//   value_t max_value;
//   bool invSum;
//   value_t accum = 0;
//
//   inline bool is_last() const {
//     return i_child + 1 >= static_cast<int>(node->children.size());
//   }
// };

struct ValueSearchContext {
  const ComponentType type;
  const ValueList& available_values;
  const value_t target;

  SearchState root_state = nullptr;
  std::vector<SearchState> leaf_states;
  // std::vector<TopologyNode> topos;
  // std::vector<value_t> buffer;
  // std::vector<ValueSearchState> stack;
  int num_elements;
  bool aborted = false;

  ValueSearchContext(ComponentType type, const ValueList& values,
                     TopologyNode topology, value_t target = VALUE_NONE)
      : type(type), available_values(values), target(target) {
    root_state = build_search_state_tree(type, leaf_states, topology);
    // RCCOMB_DEBUG_PRINT("root_state.size()=%zu\n", leaf_states.size());
    num_elements = topology->num_leafs;
  }

  void abort() { aborted = true; }
};

template <class callback_t>
void search_combinations_recursive(ValueSearchContext& ctx, int pos,
                                   const callback_t& callback) {
  // const value_t POSI_INFINITY = std::numeric_limits<value_t>::infinity();
  // const value_t NEGA_INFINITY = -POSI_INFINITY;

  // RCCOMB_DEBUG_PRINT("pos=%d\n", pos);

  auto& st = ctx.leaf_states[pos];

  int count = 0;
  const auto* values = ctx.available_values.get_values(0, 1e30, &count);
  // RCCOMB_DEBUG_PRINT("pos=%d, count=%d\n", pos, count);
  for (int i = 0; i < count; i++) {
    // RCCOMB_DEBUG_PRINT("\n");
    st->value = values[i];
    // RCCOMB_DEBUG_PRINT("st->value=%lf\n", st->value);

    auto parent = st->parent;
    // RCCOMB_DEBUG_PRINT("pos=%d, st->node->hash=%08X\n", pos, st->node->hash);
    while (parent) {
      // RCCOMB_DEBUG_PRINT("parent->node->hash=%08X\n", parent->node->hash);
      value_t accum = 0;
      auto child = parent->first_child;
      while (child) {
        // RCCOMB_DEBUG_PRINT("accum=%lf <-- value=%lf\n", accum, child->value);
        if (parent->inv_sum) {
          accum += 1.0 / child->value;
        } else {
          accum += child->value;
        }
        child = child->next_brother;
      }
      parent->value = parent->inv_sum ? (1.0 / accum) : accum;
      // RCCOMB_DEBUG_PRINT(
      //     "pos=%d, parent.hash=%08X, parent->value=%lf, is_root=%d\n", pos,
      //     parent->node->hash, parent->value, parent->is_root());
      if (!parent->is_last()) {
        break;
      }
      parent = parent->parent;
    }

    if (pos + 1 < ctx.num_elements) {
      // RCCOMB_DEBUG_PRINT("\n");
      search_combinations_recursive(ctx, pos + 1, callback);
    } else {
      // #ifdef RCCOMB_DEBUG
      //       RCCOMB_DEBUG_PRINT("combination: %s\n",
      //                          ctx.root_state->to_string().c_str());
      // #endif
      callback(ctx, ctx.root_state->value);
    }

    if (ctx.aborted) {
      RCCOMB_DEBUG_PRINT("aborting...\n");
      return;
    }
    // RCCOMB_DEBUG_PRINT("\n");
  }
}

std::vector<Combination> search_combinations(ValueSearchOptions& options) {
  std::vector<value_t> buffer(options.max_elements);

  std::vector<bool> parallels = {false, true};

  const value_t epsilon = options.target / 1e9;

  value_t best_error = std::numeric_limits<value_t>::infinity();
  std::vector<Combination> best_combs;

  // 素子数が少ない順に試す
  for (int n = 1; n <= options.max_elements; n++) {
    // RCCOMB_DEBUG_PRINT("num_elements=%d\n", n);
    //  並列・直列パターンを全部試す
    for (bool parallel : parallels) {
      const auto topos = get_topologies(n, parallel);
      // 全トポロジーを試す
      for (const auto& topo : topos) {
        // RCCOMB_DEBUG_PRINT("topo hash=%08X, leafs=%d\n", topo->hash,
        //                           topo->num_leafs);
        ValueSearchContext ctx(options.type, options.available_values, topo,
                               options.target);
        const auto cb = [&](ValueSearchContext& ctx, value_t value) {
          const auto error = std::abs(value - ctx.target);
          if (error < best_error - epsilon) {
            best_combs.clear();
          }
          if (error < best_error + epsilon) {
            best_error = error;
            best_combs.push_back(ctx.root_state->bake(options.type));
            RCCOMB_DEBUG_PRINT("value=%lf error=%lf\n", value, error);
          }
        };
        search_combinations_recursive(ctx, 0, cb);
      }
    }

    if (best_error < epsilon) {
      // 十分良い解が見つかったら終了
      break;
    }
  }

  return best_combs;
}

#endif

}  // namespace rccomb

#endif
