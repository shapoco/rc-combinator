#ifndef RCCOMB_RCCOMB_HPP
#define RCCOMB_RCCOMB_HPP

#include <cmath>
#include <limits>
#include <map>
#include <stack>
#include <vector>

#include "rccomb/combination.hpp"
#include "rccomb/common.hpp"
#include "rccomb/double_combination.hpp"
#include "rccomb/search_state.hpp"
#include "rccomb/topology.hpp"
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

struct DividerSearchOptions {
  const ComponentType type;
  const ValueList available_values;
  const value_t target_ratio;
  const value_t total_min;
  const value_t total_max;
  int max_elements;

  DividerSearchOptions(ComponentType type, const ValueList& values,
                       value_t target_rat, value_t total_min_val,
                       value_t total_max_val, int max_elems)
      : type(type),
        available_values(values),
        target_ratio(target_rat),
        total_min(total_min_val),
        total_max(total_max_val),
        max_elements(max_elems) {}
};

result_t search_combinations(ValueSearchOptions& options,
                             std::vector<Combination>& out_combs);
result_t search_dividers(DividerSearchOptions& options,
                         std::vector<DoubleCombination>& best_combs);

#ifdef RCCOMB_IMPLEMENTATION

struct ValueSearchContext;

struct ValueSearchContext {
  const ComponentType type;
  const ValueList& available_values;

  SearchState root_state = nullptr;
  std::vector<SearchState> leaf_states;
  int num_elements;
  bool aborted = false;

  ValueSearchContext(ComponentType type, const ValueList& values,
                     Topology topology, value_t min = 0,
                     value_t max = VALUE_POSITIVE_INFINITY,
                     value_t target = VALUE_NONE)
      : type(type), available_values(values) {
    root_state = build_search_state_tree(type, leaf_states, topology);
    root_state->update_min_max(min, max);
    root_state->target = target;
    num_elements = topology->num_leafs;
  }

  void abort() { aborted = true; }
};

static void update_target_of_next_brother_of(SearchState st);

// 探索木の葉にひとつずつ値を設定して探索
template <class callback_t>
void search_combinations_recursive(ValueSearchContext& ctx, int pos,
                                   const callback_t& callback) {
  auto& st = ctx.leaf_states[pos];

  value_t min = st->min;
  value_t max = st->max;

  if (min > max) return;

  bool last = pos + 1 >= ctx.num_elements;

  int count = 0;
  const value_t* values = nullptr;
  if (value_is_valid(st->target)) {
    // ターゲット値が指定されている場合は最も近い値だけを試す
    values = ctx.available_values.get_nearest(st->target, &count);
    if (values[count - 1] < min || max < values[0]) {
      return;
    }
  } else {
    values = ctx.available_values.get_values(min, max, &count);
  }

  for (int i = 0; i < count; i++) {
    // 葉に値を設定
    st->value = values[i];

    // 親ノードを辿って値を更新
    auto child = st;
    while (!child->is_root()) {
      auto parent = child->parent;

      // 兄ノードの積算値に自ノードの値を加算
      auto prev = child->prev_brother;
      child->accum = prev ? prev->accum : 0;
      if (parent->inv_sum) {
        child->accum += 1 / child->value;
      } else {
        child->accum += child->value;
      }

      if (child->is_last_child()) {
        // 兄弟全部の積算値が揃ったら親ノードの値を更新
        if (parent->inv_sum) {
          parent->value = 1 / child->accum;
        } else {
          parent->value = child->accum;
        }
      } else {
        // 弟ノードの目標値と値域を更新
        update_target_of_next_brother_of(child);
        break;
      }

      child = parent;
    }

    if (last) {
      // 全ての葉が埋まったらコールバック
      callback(ctx, ctx.root_state->value);
    } else {
      // 次の葉へ
      search_combinations_recursive(ctx, pos + 1, callback);
    }

    if (ctx.aborted) {
      // 中止
      return;
    }
  }
}

static void update_target_of_next_brother_of(SearchState st) {
  if (st->is_root() || st->is_last_child()) {
    return;
  }

  // 枝刈り:
  // 親ノードの min/max とここまでの部分和から
  // 兄弟ノードの min/max を計算
  auto brother = st->next_brother;
  auto parent = st->parent;
  value_t parent_min = parent->min;
  value_t parent_max = parent->max;
  value_t brother_min = 0;
  value_t brother_max = VALUE_POSITIVE_INFINITY;
  value_t partial_val = parent->inv_sum ? (1 / st->accum) : st->accum;
  if (parent->inv_sum) {
    // 並列和
    if (brother->is_last_child()) {
      brother_min = partial_val * parent_min / (partial_val - parent_min);
      brother_max = partial_val * parent_max / (partial_val - parent_max);
      if (brother_max < brother_min) {
        brother_max = VALUE_POSITIVE_INFINITY;
      }
    } else {
      brother_min = parent->min;
    }
  } else {
    // 直列和
    if (brother->is_last_child()) {
      brother_min = parent->min - partial_val;
    }
    brother_max = parent->max - partial_val;
  }

  // 枝刈り:
  // 同じトポロジーの隣り合うノードは値が降順になるようにする
  if (st->topology->hash == brother->topology->hash) {
    if (brother_max > st->value) {
      brother_max = st->value;
    }
  }

  // 弟ノードとその子ノードの min/max を更新
  brother->update_min_max(brother_min, brother_max);

  // 弟が木の右端に位置する場合は目標値を更新
  if (value_is_valid(parent->target) && brother->is_finisher) {
    value_t parent_target = parent->target;
    if (parent->topology->parallel) {
      brother->target =
          partial_val * parent_target / (partial_val - parent_target);
    } else {
      brother->target = parent_target - partial_val;
    }
  }
}

static void filter_unnormalized_combinations(std::vector<Combination>& combs);

// 合成抵抗・合成容量の探索
result_t search_combinations(ValueSearchOptions& options,
                             std::vector<Combination>& best_combs) {
  // 探索空間の大きさをチェック
  const double search_space =
      std::pow((double)options.available_values.size(), options.max_elements);
  if (options.max_elements > 10 || search_space > 1e7) {
    return result_t::SEARCH_SPACE_TOO_LARGE;
  }

  const value_t epsilon = options.target / 1e9;

  value_t best_error = std::numeric_limits<value_t>::infinity();
  int best_num_elems = std::numeric_limits<int>::max();

  // 素子数が少ない順に試す
  std::vector<bool> parallels = {false, true};
  for (int num_elems = 1; num_elems <= options.max_elements; num_elems++) {
    //  並列・直列パターンを全部試す
    for (bool parallel : parallels) {
      // 1 素子の場合は直列のみ探索
      if (num_elems == 1 && parallel) continue;

      // 全トポロジーを試す
      const auto& topos = get_topologies(num_elems, parallel);
      for (const auto& topo : topos) {
        ValueSearchContext ctx(options.type, options.available_values, topo,
                               options.min_value, options.max_value,
                               options.target);
        const auto cb = [&](ValueSearchContext& ctx, value_t value) {
          const auto error = std::abs(value - options.target);
          if (error < best_error - epsilon) {
            best_combs.clear();
          }
          if (error < best_error + epsilon && num_elems <= best_num_elems) {
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

  // 重複回避のため正規化されているものだけを残す
  filter_unnormalized_combinations(best_combs);

  for (auto& comb : best_combs) {
    result_t ret = comb->verify();
    if (ret != result_t::SUCCESS) {
      return ret;
    }
  }

  return result_t::SUCCESS;
}

// 分圧抵抗の探索
result_t search_dividers(DividerSearchOptions& options,
                         std::vector<DoubleCombination>& best_combs) {
  const value_t epsilon = 1e-9;

  // 探索空間の大きさをチェック
  const double search_space = std::pow((double)options.available_values.size(),
                                       2 * options.max_elements);
  if (options.max_elements > 10 || search_space > 1e8) {
    return result_t::SEARCH_SPACE_TOO_LARGE;
  }

  value_t best_error = VALUE_POSITIVE_INFINITY;
  std::map<value_t, DoubleCombination> result_memo;

  const value_t ratio_min = options.target_ratio / 2;
  const value_t ratio_max = 1.0 - (1.0 - options.target_ratio) / 2;

  const value_t lower_min = options.total_min * ratio_min;
  const value_t lower_max = options.total_max * ratio_max;
  const value_t upper_min = options.total_min * (1.0 - ratio_max);
  const value_t upper_max = options.total_max * (1.0 - ratio_min);

  std::vector<Combination> upper_combs;

  // 下側の抵抗値を列挙する
  std::vector<bool> parallels = {false, true};
  for (int num_lowers = 1; num_lowers <= options.max_elements; num_lowers++) {
    //  並列・直列パターンを全部試す
    for (bool parallel : parallels) {
      // 1 素子の場合は直列のみ探索
      if (num_lowers == 1 && parallel) continue;

      // 全トポロジーを試す
      const auto topos = get_topologies(num_lowers, parallel);
      for (const auto& topo : topos) {
        ValueSearchContext vsc(options.type, options.available_values, topo,
                               lower_min, lower_max);
        result_t upper_error = result_t::SUCCESS;
        const auto cb = [&](ValueSearchContext& ctx, value_t lower_value) {
          const value_t target_total_value = lower_value / options.target_ratio;
          const value_t target_upper_value = target_total_value - lower_value;
          if (target_total_value < options.total_min ||
              options.total_max < target_total_value) {
            return;
          }

          if (result_memo.contains(lower_value)) {
            // 既知の結果の lower と一致
            const auto lower_comb = ctx.root_state->bake(options.type);
            result_memo[lower_value]->lowers.push_back(lower_comb);
            return;
          }

          // 下側の抵抗値に対応する上側の抵抗を列挙する
          ValueSearchOptions vso(options.type, options.available_values,
                                 upper_min, upper_max, options.max_elements,
                                 target_upper_value);
          upper_combs.clear();
          result_t ret = search_combinations(vso, upper_combs);
          if (ret != result_t::SUCCESS) {
            upper_error = ret;
            ctx.abort();
            return;
          }
          if (upper_combs.empty()) {
            // 条件を満たす上位側の組み合わせなし
            return;
          }

          const value_t ratio =
              lower_value / (upper_combs[0]->value + lower_value);
          const value_t error = std::abs(ratio - options.target_ratio);
          if (error - epsilon > best_error) {
            // 既知の組み合わせより悪い
            return;
          }

          if (error + epsilon < best_error) {
            // 既知の組み合わせより良い
            best_combs.clear();
          }

          auto double_comb = create_double_combination(ratio);
          double_comb->uppers = upper_combs;
          double_comb->lowers.push_back(ctx.root_state->bake(options.type));
          result_memo[lower_value] = double_comb;
          best_combs.push_back(double_comb);
          best_error = error;
        };
        search_combinations_recursive(vsc, 0, cb);
        if (upper_error != result_t::SUCCESS) {
          return upper_error;
        }
      }
    }

    if (best_error <= epsilon) {
      break;
    }
  }

  for (auto& comb : best_combs) {
    filter_unnormalized_combinations(comb->uppers);
    filter_unnormalized_combinations(comb->lowers);
    result_t ret = comb->verify();
    if (ret != result_t::SUCCESS) {
      return ret;
    }
  }

  return result_t::SUCCESS;
}

// 正規化されていないトポロジを削除 (重複回避)
static void filter_unnormalized_combinations(std::vector<Combination>& combs) {
  for (size_t i = 0; i < combs.size();) {
    if (combs[i]->is_normalized()) {
      i++;
    } else {
      combs.erase(combs.begin() + i);
    }
  }
}

#endif

}  // namespace rccomb

#endif
