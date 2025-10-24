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

struct ValueSearchContext {
  const ComponentType type;
  const ValueList& available_values;
  const value_t target;

  SearchState root_state = nullptr;
  std::vector<SearchState> leaf_states;
  int num_elements;
  bool aborted = false;

  ValueSearchContext(ComponentType type, const ValueList& values,
                     TopologyNode topology, value_t min = 0,
                     value_t max = VALUE_POSITIVE_INFINITY,
                     value_t target = VALUE_NONE)
      : type(type), available_values(values), target(target) {
    root_state = build_search_state_tree(type, leaf_states, topology);
    root_state->update_min_max(min, max);
    num_elements = topology->num_leafs;
  }

  void abort() { aborted = true; }
};

static void update_min_max_of_next_brother_of(SearchState st);

template <class callback_t>
void search_combinations_recursive(ValueSearchContext& ctx, int pos,
                                   const callback_t& callback) {
  auto& st = ctx.leaf_states[pos];

  value_t min = st->min;
  value_t max = st->max;

  if (min > max) return;

  int count = 0;
  const auto* values = ctx.available_values.get_values(min, max, &count);
  for (int i = 0; i < count; i++) {
    // 葉に値を設定
    st->value = values[i];

    // 親ノードを辿って値を更新
    auto younguest = st;
    while (!younguest->is_root() && younguest->is_younguest()) {
      younguest = younguest->parent;
      younguest->value = younguest->sum();
    }

    // 枝刈り
    // (次の葉ノードとそれを含む親ノードの min/max を更新)
    update_min_max_of_next_brother_of(younguest);

    if (pos + 1 < ctx.num_elements) {
      // 次の葉へ
      search_combinations_recursive(ctx, pos + 1, callback);
    } else {
      // 全ての葉が埋まったらコールバック
      callback(ctx, ctx.root_state->value);
    }

    if (ctx.aborted) {
      // 中止
      return;
    }
  }
}

static void update_min_max_of_next_brother_of(SearchState st) {
  if (st->is_root() || st->is_younguest()) {
    return;
  }

  auto brother = st->next_brother;
  auto parent = st->parent;

  value_t parent_min = parent->min;
  value_t parent_max = parent->max;

  value_t partial_val = parent->sum(st->id);
  value_t brother_min = 0;
  value_t brother_max = VALUE_POSITIVE_INFINITY;
  if (parent->inv_sum) {
    if (brother->is_younguest()) {
      brother_min = partial_val * parent_min / (partial_val - parent_min);
      brother_max = partial_val * parent_max / (partial_val - parent_max);
      if (brother_max < brother_min) {
        brother_max = VALUE_POSITIVE_INFINITY;
      }
    } else {
      brother_min = parent->min;
    }
  } else {
    if (st->is_younguest()) {
      brother_min = parent->min - partial_val;
    }
    brother_max = parent->max - partial_val;
  }

  if (st->node->hash == brother->node->hash) {
    if (brother_max > st->value) {
      brother_max = st->value;
    }
  }

  brother->update_min_max(brother_min, brother_max);
}

std::vector<Combination> search_combinations(ValueSearchOptions& options) {
  std::vector<value_t> buffer(options.max_elements);

  std::vector<bool> parallels = {false, true};

  const value_t epsilon = options.target / 1e9;

  value_t best_error = std::numeric_limits<value_t>::infinity();
  std::vector<Combination> best_combs;

  // 素子数が少ない順に試す
  for (int n = 1; n <= options.max_elements; n++) {
    //  並列・直列パターンを全部試す
    for (bool parallel : parallels) {
      const auto topos = get_topologies(n, parallel);
      // 全トポロジーを試す
      for (const auto& topo : topos) {
        ValueSearchContext ctx(options.type, options.available_values, topo,
                               options.min_value, options.max_value,
                               options.target);
        const auto cb = [&](ValueSearchContext& ctx, value_t value) {
          const auto error = std::abs(value - ctx.target);
          if (error < best_error - epsilon) {
            best_combs.clear();
          }
          if (error < best_error + epsilon) {
            best_error = error;
            best_combs.push_back(ctx.root_state->bake(options.type));
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
