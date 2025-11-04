#ifndef RCCOMB_RCCOMB_HPP
#define RCCOMB_RCCOMB_HPP

#include <cmath>
#include <limits>
#include <map>
#include <stack>
#include <vector>

#include "rcmb/combination.hpp"
#include "rcmb/common.hpp"
#include "rcmb/double_combination.hpp"
#include "rcmb/search_state.hpp"
#include "rcmb/topology.hpp"
#include "rcmb/value_list.hpp"

namespace rcmb {

struct ValueSearchArgs {
  const ComponentType type;
  const ValueList& element_values;
  const int max_elements;
  const value_t target;
  const value_t target_min;
  const value_t target_max;
  topology_constraint_t topology_constraint = topology_constraint_t::NO_LIMIT;
  int max_depth = 9999;

  ValueSearchArgs(ComponentType type, const ValueList& values, int max_elems,
                  value_t target, value_t target_min, value_t target_max)
      : type(type),
        element_values(values),
        max_elements(max_elems),
        target(target),
        target_min(target_min),
        target_max(target_max) {}
};

struct DividerSearchArgs {
  const ValueList& element_values;
  int max_elements;
  const value_t total_min;
  const value_t total_max;
  const value_t target_value;
  const value_t target_min;
  const value_t target_max;
  topology_constraint_t topology_constraint = topology_constraint_t::NO_LIMIT;
  int max_depth = 9999;

  DividerSearchArgs(const ValueList& values, int max_elems,
                    value_t total_min_val, value_t total_max_val,
                    value_t target_val, value_t target_min, value_t target_max)
      : element_values(values),
        max_elements(max_elems),
        total_min(total_min_val),
        total_max(total_max_val),
        target_value(target_val),
        target_min(target_min),
        target_max(target_max) {}
};

result_t search_combinations(ValueSearchArgs& args,
                             std::vector<Combination>& out_combs);
result_t search_dividers(DividerSearchArgs& args,
                         std::vector<DoubleCombination>& best_combs);

#ifdef RCCOMB_IMPLEMENTATION

class CombinationEnumContext {
 public:
  const ComponentType type;
  const ValueList& element_values;
  const int num_elements;

  SearchState root_state = nullptr;
  std::vector<SearchState> leaf_states;
  bool aborted = false;

  CombinationEnumContext(ComponentType type, const ValueList& elem_values,
                         Topology& topology, value_t min = 0,
                         value_t max = VALUE_POSITIVE_INFINITY,
                         value_t target = VALUE_NONE)
      : type(type),
        element_values(elem_values),
        num_elements(topology->num_leafs) {
    root_state = build_search_state_tree(type, leaf_states, topology);
    root_state->update_min_max(min, max);
    root_state->target = target;
  }

  ~CombinationEnumContext() {
    // 重要: ツリーを解体しないとメモリリークする
    root_state->unlink();
  }

  void abort() { aborted = true; }
};

static void update_target_of_next_brother_of(SearchState st);

// 探索木の葉にひとつずつ値を設定して探索
template <class callback_t>
void enum_combinations_recursive(CombinationEnumContext& ctx, int pos,
                                 const callback_t& callback) {
  auto st = ctx.leaf_states[pos];

  value_t min = st->min;
  value_t max = st->max;

  if (min > max) return;

  bool last = pos + 1 >= ctx.num_elements;

  int count = 0;
  const value_t* values = nullptr;
  if (value_is_valid(st->target)) {
    // ターゲット値が指定されている場合は最も近い値だけを試す
    values = ctx.element_values.get_nearest(st->target, &count);
    if (values[count - 1] < min || max < values[0]) {
      return;
    }
  } else {
    values = ctx.element_values.get_values(min, max, &count);
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
      enum_combinations_recursive(ctx, pos + 1, callback);
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
  if (st->topology->id == brother->topology->id) {
    if (brother_max > st->value) {
      brother_max = st->value;
    }
  }

  // 弟ノードとその子ノードの min/max を更新
  brother->update_min_max(brother_min, brother_max);

  // 弟が木の右端に位置する場合は目標値を更新
  if (value_is_valid(parent->target) && brother->is_finisher) {
    value_t parent_target = parent->target;
    if (parent->inv_sum) {
      brother->target =
          partial_val * parent_target / (partial_val - parent_target);
    } else {
      brother->target = parent_target - partial_val;
    }
  }
}

static void filter_unnormalized_combinations(std::vector<Combination>& combs);

// 合成抵抗・合成容量の探索
result_t search_combinations(ValueSearchArgs& args,
                             std::vector<Combination>& best_combs) {
  // 探索空間の大きさをチェック
  if (args.max_elements > 15) {
    return result_t::SEARCH_SPACE_TOO_LARGE;
  }

  const value_t eps = args.target / 1e9;

  const value_t target_min = args.target_min;
  const value_t target_max = args.target_max;

  value_t best_min = target_min;
  value_t best_max = target_max;
  value_t best_error = std::numeric_limits<value_t>::infinity();
  int best_elems = std::numeric_limits<int>::max();

  const int topo_constr = static_cast<int>(args.topology_constraint);

  // 素子数が少ない順に試す
  std::vector<bool> parallels = {false, true};
  for (int num_elems = 1; num_elems <= args.max_elements; num_elems++) {
    //  並列・直列パターンを全部試す
    for (bool parallel : parallels) {
      // 1 素子の場合は直列のみ探索
      if (num_elems == 1 && parallel) continue;

      // 全トポロジーを試す
      auto& topos = get_topologies(num_elems, parallel);
      for (auto& topo : topos) {
        int t = topo->parallel
                    ? static_cast<int>(topology_constraint_t::PARALLEL)
                    : static_cast<int>(topology_constraint_t::SERIES);
        if (num_elems >= 2 && !(t & topo_constr)) continue;
        if (topo->depth > args.max_depth) continue;

        CombinationEnumContext cec(args.type, args.element_values, topo,
                                   best_min, best_max, args.target);
        const auto cb = [&](CombinationEnumContext& ctx, value_t value) {
          if (value < target_min - eps || target_max + eps < value) {
            return;
          }

          const auto error = std::abs(value - args.target);
          if (error - eps > best_error) {
            return;
          } else if (error + eps >= best_error) {
            if (num_elems > best_elems) {
              return;
            } else if (num_elems < best_elems) {
              best_combs.clear();
            }
          } else {
            best_combs.clear();
          }
          best_combs.emplace_back(ctx.root_state->bake(args.type));
          best_error = error;
          best_elems = num_elems;
          if (value < args.target) {
            if (best_min - eps < value) best_min = value;
          } else {
            if (best_max + eps > value) best_max = value;
          }
        };
        enum_combinations_recursive(cec, 0, cb);
      }
    }

    if (best_error < eps) {
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
result_t search_dividers(DividerSearchArgs& args,
                         std::vector<DoubleCombination>& best_combs) {
  const value_t eps = 1e-9;

  // 探索空間の大きさをチェック
  if (args.max_elements > 15) {
    return result_t::SEARCH_SPACE_TOO_LARGE;
  }

  value_t best_error = VALUE_POSITIVE_INFINITY;
  int best_elems = std::numeric_limits<int>::max();
  std::map<uint32_t, DoubleCombination> result_memo;

  const value_t target_total_min = args.total_min;
  const value_t target_total_max = args.total_max;

  const value_t target_min = args.target_min;
  const value_t target_max = args.target_max;

  const value_t target_lower_min = target_total_min * target_min;
  const value_t target_lower_max = target_total_max * target_max;
  const value_t target_upper_min = target_total_min * (1.0 - target_max);
  const value_t target_upper_max = target_total_max * (1.0 - target_min);

  std::vector<Combination> upper_combs;

  const int topo_constr = static_cast<int>(args.topology_constraint);

  // 下側の抵抗値を列挙する
  std::vector<bool> parallels = {false, true};
  for (int num_lowers = 1; num_lowers <= args.max_elements - 1; num_lowers++) {
    //  並列・直列パターンを全部試す
    for (bool parallel : parallels) {
      // 1 素子の場合は直列のみ探索
      if (num_lowers == 1 && parallel) continue;

      // 全トポロジーを試す
      auto& topos = get_topologies(num_lowers, parallel);
      for (auto& topo : topos) {
        // 上側の最大素子数
        int upper_max_elements = args.max_elements - num_lowers;
        if (best_error < eps) {
          // 既に誤差の無い組み合わせが見つかっている場合は素子数を絞る
          upper_max_elements = best_elems - num_lowers;
          if (upper_max_elements <= 0) {
            break;
          }
        }

        int t = topo->parallel
                    ? static_cast<int>(topology_constraint_t::PARALLEL)
                    : static_cast<int>(topology_constraint_t::SERIES);
        if (num_lowers >= 2 && !(t & topo_constr)) continue;
        if (topo->depth > args.max_depth) continue;
        CombinationEnumContext cec(ComponentType::Resistor, args.element_values,
                                   topo, target_lower_min, target_lower_max);
        result_t upper_error = result_t::SUCCESS;
        const auto cb = [&](CombinationEnumContext& ctx, value_t lower_val) {
          const value_t est_upper_val =
              lower_val / args.target_value - lower_val;
          const value_t est_total_min = lower_val + est_upper_val;
          const value_t est_total_max = lower_val + est_upper_val;
          if (est_total_max < target_total_min - eps ||
              target_total_max + eps < est_total_min) {
            return;
          }

          const uint32_t lower_key = valueKeyOf(lower_val);
          if (result_memo.contains(lower_key)) {
            // 既知の結果の lower と一致
            auto& memo = result_memo[lower_key];
            const int memo_lowers = memo->lowers[0]->num_leafs();
            const int memo_elems = memo_lowers + memo->uppers[0]->num_leafs();
            if (num_lowers <= memo_lowers && memo_elems <= best_elems) {
              memo->lowers.emplace_back(
                  ctx.root_state->bake(ComponentType::Resistor));
            }
            return;
          }

          // 下側の抵抗値に対応する上側の抵抗を列挙する
          ValueSearchArgs vsa(ComponentType::Resistor, args.element_values,
                              upper_max_elements, est_upper_val,
                              target_upper_min, target_upper_max);
          vsa.topology_constraint = args.topology_constraint;
          vsa.max_depth = args.max_depth;
          upper_combs.clear();
          result_t ret = search_combinations(vsa, upper_combs);
          if (ret != result_t::SUCCESS) {
            upper_error = ret;
            ctx.abort();
            return;
          }
          if (upper_combs.empty()) {
            // 条件を満たす上位側の組み合わせなし
            return;
          }
          const value_t upper_val = upper_combs[0]->value;
          const value_t total_val = lower_val + upper_val;
          const value_t ratio = lower_val / total_val;
          if (ratio < target_min - eps || target_max + eps < ratio) {
            return;
          }
          if (total_val < target_total_min - eps ||
              target_total_max + eps < total_val) {
            return;
          }

          const int num_elems = num_lowers + upper_combs[0]->num_leafs();

          const value_t error = std::abs(ratio - args.target_value);
          if (error - eps > best_error) {
            return;
          } else if (error + eps >= best_error) {
            if (num_elems > best_elems) {
              return;
            } else if (num_elems < best_elems) {
              best_combs.clear();
            }
          } else {
            best_combs.clear();
          }

          auto double_comb = create_double_combination(ratio);
          double_comb->uppers = upper_combs;
          double_comb->lowers.emplace_back(
              ctx.root_state->bake(ComponentType::Resistor));
          result_memo[lower_key] = double_comb;
          best_combs.emplace_back(std::move(double_comb));
          best_error = error;
          best_elems = num_elems;
        };

        enum_combinations_recursive(cec, 0, cb);

        if (upper_error != result_t::SUCCESS) {
          return upper_error;
        }
      }
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

}  // namespace rcmb

#endif
