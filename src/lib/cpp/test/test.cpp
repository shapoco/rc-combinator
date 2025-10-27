#include <chrono>
#include <cstdio>
#include <map>
#include <memory>
#include <stack>
#include <vector>

#include <rccomb/rccomb.hpp>

using namespace rccomb;

class TestTopologyClass;
using TestTopology = std::shared_ptr<TestTopologyClass>;
class TestTopologyClass {
 public:
  bool parallel;
  const int num_leafs;
  std::vector<TestTopology> children;
  TestTopologyClass(bool parallel, int num_leafs,
                    const std::vector<TestTopology>& children)
      : parallel(parallel), num_leafs(num_leafs), children(children) {}
  inline bool is_leaf() const { return children.empty(); }
};
static inline TestTopology create_test_topology(
    bool parallel, int num_leafs, const std::vector<TestTopology>& children) {
  return std::make_shared<TestTopologyClass>(parallel, num_leafs, children);
}

class TestCombinationClass;
using TestCombination = std::shared_ptr<TestCombinationClass>;
class TestCombinationClass {
 public:
  TestTopology topology;
  std::vector<TestCombination> children;
  value_t value;
  TestCombinationClass(const TestTopology& topology,
                       const std::vector<TestCombination>& children,
                       value_t value)
      : topology(topology), children(children), value(value) {}
  inline bool is_leaf() const { return topology->is_leaf(); }
  inline std::string to_string() const {
    if (is_leaf()) {
      return std::to_string(value);
    } else {
      std::string s;
      for (size_t i = 0; i < children.size(); i++) {
        const auto& child = children[i];
        if (child->is_leaf()) {
          s += child->to_string();
        } else {
          s += "(" + child->to_string() + ")";
        }
        if (i + 1 < children.size()) {
          s += topology->parallel ? "//" : "--";
        }
      }
      // s += "==>" + std::to_string(value);
      return s;
    }
  }
};
static inline TestCombination create_test_combination(
    const TestTopology& topology, const std::vector<TestCombination>& children,
    value_t value) {
  return std::make_shared<TestCombinationClass>(topology, children, value);
}

std::map<int, std::vector<TestTopology>> topologies;

bool test_search_combinations(ComponentType type, std::vector<value_t>& series,
                              int max_elements, value_t target);
TestCombination calc_value(ComponentType type, TestTopology& topo,
                           const std::vector<value_t>& leaf_values, int pos,
                           value_t* out_value = nullptr, bool bake = false);
std::vector<TestTopology>& test_get_topology(bool parallel, int n);
void test_collect_topologies(bool parallel, std::vector<TestTopology>& topos,
                             const std::vector<int>& poses);

int main(int argc, char** argv) {
  std::vector<value_t> K10 = {10000};
  std::vector<value_t> E3 = {100,    220,    470,    1000,  2200,
                             4700,   10000,  22000,  47000, 100000,
                             220000, 470000, 1000000};

  std::vector<ComponentType> types = {ComponentType::Resistor,
                                      ComponentType::Capacitor};
  std::vector<value_t> targets = {
      100,  111,  123,  137,  150,  162,  178,   196,   215, 233,
      249,  270,  294,  316,  340,  364,  390,   430,   470, 511,
      540,  581,  620,  680,  721,  750,  820,   872,   930, 1575,
      2947, 3954, 4000, 7246, 9000, 9999, 14000, 26000,
  };
  for (const auto& type : types) {
    for (int max_elements = 1; max_elements <= 5; max_elements++) {
      RCCOMB_DEBUG_PRINT(
          "Testing search_combinations: type=%d, max_elements=%d\n",
          static_cast<int>(type), max_elements);
      for (const auto& target : targets) {
        bool ok = test_search_combinations(type, E3, max_elements, target);
        if (!ok) {
          printf("Test failed: type=%d, max_elements=%d, target=%.9f\n",
                 static_cast<int>(type), max_elements, target);
          return -1;
        }
      }
    }
  }

  {
    ValueList series(E3);

    DividerSearchOptions options(ComponentType::Resistor, series, 3.3 / 5.0,
                                 10000, 100000, 2);
    auto start = std::chrono::high_resolution_clock::now();
    std::vector<DoubleCombination> dividers;
    result_t ret = search_dividers(options, dividers);
    auto end = std::chrono::high_resolution_clock::now();

    for (const auto& div : dividers) {
      printf("%s\n", div->to_string().c_str());
      // printf("%s\n", div->to_json_string().c_str());
    }

    std::chrono::duration<double, std::milli> duration = end - start;
    printf("Search took %.2f ms\n", duration.count());
  }

  return 0;
}

bool test_search_combinations(ComponentType type, std::vector<value_t>& series,
                              int max_elements, value_t target) {
  value_t min = target / 2;
  value_t max = target * 2;
  ValueSearchOptions options(type, series, min, max, max_elements, target);

  std::vector<Combination> dut_combs;
  result_t ret = search_combinations(options, dut_combs);
  if (ret != result_t::SUCCESS) {
    printf("Error: %s\n", result_to_string(ret));
    return false;
  }
  int dut_elements = 9999;
  value_t dut_value = VALUE_NONE;
  value_t dut_error = VALUE_POSITIVE_INFINITY;
  Combination dut_comb;
  for (const auto& comb : dut_combs) {
    value_t error = std::abs(comb->value - target);
    if (error < dut_error) {
      dut_value = comb->value;
      dut_error = error;
      dut_elements = comb->topology->num_leafs;
      dut_comb = comb;
    }
  }

  value_t epsilon = target / 1e9;
  value_t exp_value = VALUE_NONE;
  value_t exp_error = VALUE_POSITIVE_INFINITY;
  int exp_elements = 0;
  TestCombination exp_comb;

  std::vector<bool> parallels = {false, true};

  for (int num_elements = 1; num_elements <= max_elements; num_elements++) {
    for (auto parallel : parallels) {
      if (num_elements == 1 && parallel) continue;
      auto& topos = test_get_topology(parallel, num_elements);

      std::vector<value_t> slot(num_elements, 0);
      std::vector<int> indices(num_elements, 0);
      int series_size = series.size();
      while (indices[num_elements - 1] < series_size) {
        for (int i = 0; i < num_elements; i++) {
          slot[i] = series[indices[i]];
        }

        for (auto& topo : topos) {
          value_t value;
          calc_value(type, topo, slot, 0, &value);
          value_t error = std::abs(value - target);
          if (error < exp_error - epsilon) {
            exp_value = value;
            exp_error = error;
            exp_elements = num_elements;
            exp_comb = calc_value(type, topo, slot, 0, nullptr, true);
            // RCCOMB_DEBUG_PRINT("Found better combination: %lf (error=%lf)\n",
            //                    val, error);
          }
        }

        // Increment indices
        for (int i = 0; i < num_elements; i++) {
          indices[i]++;
          if (indices[i] < series_size) {
            break;
          } else if (i + 1 >= num_elements) {
            break;
          } else {
            indices[i] = 0;
          }
        }
      }
    }

    if (exp_error < epsilon) {
      break;
    }
  }

  bool unmatch = false;
  if ((dut_error > exp_error + epsilon * 10) ||
      (dut_error < exp_error - epsilon * 10)) {
    unmatch = true;
  }
  if ((dut_elements != exp_elements)) {
    unmatch = true;
  }
  if (unmatch) {
    printf("*ERROR: Mismatch found (Target=%lf):\n", target);
    printf("  |   | N|          Value|          Error|\n");
    printf("  |Exp|%2d|%15.9lf|%15.9lf| %s\n", exp_elements, exp_value,
           exp_error, exp_comb->to_string().c_str());
    printf("  |DUT|%2d|%15.9lf|%15.9lf| %s\n", dut_elements, dut_value,
           dut_error, dut_comb->to_string().c_str());
    printf("\n");
    // return false;
  }

  return true;
}

TestCombination calc_value(ComponentType type, TestTopology& topo,
                           const std::vector<value_t>& leaf_values, int pos,
                           value_t* out_value, bool bake) {
  if (topo->is_leaf()) {
    if (out_value) {
      *out_value = leaf_values[pos];
    }
    if (bake) {
      return create_test_combination(topo, {}, leaf_values[pos]);
    } else {
      return nullptr;
    }
  }

  bool inv_sum;
  if (type == ComponentType::Resistor) {
    inv_sum = topo->parallel;
  } else {
    inv_sum = !topo->parallel;
  }

  int child_pos = pos;
  value_t accum = 0;
  std::vector<TestCombination>* child_combs = nullptr;
  if (bake) {
    child_combs = new std::vector<TestCombination>();
  }
  for (auto& child : topo->children) {
    value_t child_value;
    auto child_comb =
        calc_value(type, child, leaf_values, child_pos, &child_value, bake);
    if (bake) {
      child_combs->push_back(child_comb);
    }
    if (inv_sum) {
      accum += 1 / child_value;
    } else {
      accum += child_value;
    }
    child_pos += child->num_leafs;
  }
  value_t value = inv_sum ? (1 / accum) : accum;

  if (out_value) {
    *out_value = value;
  }
  if (bake) {
    auto ret = create_test_combination(topo, *child_combs, value);
    if (child_combs) {
      delete child_combs;
    }
    return ret;
  } else {
    return nullptr;
  }
}

std::vector<TestTopology>& test_get_topology(bool parallel, int n) {
  int key = ((n >= 2 && parallel) ? (1 << 16) : 0) | n;
  if (topologies.contains(key)) {
    return topologies[key];
  }

  if (n == 1) {
    std::vector<TestTopology> children;
    topologies[key] = {create_test_topology(false, 1, children)};
    return topologies[key];
  }

  std::vector<TestTopology> result;

  std::stack<std::vector<int>> stack;
  for (int i = n - 1; i >= 1; i--) {
    std::vector<int> part_size;
    part_size.push_back(i);
    stack.push(part_size);
  }
  while (!stack.empty()) {
    // RCCOMB_DEBUG_PRINT("stack.size()=%d\n", static_cast<int>(stack.size()));
    const auto poses = stack.top();
    stack.pop();

    int pos = poses.back();
    if (pos == n) {
      test_collect_topologies(parallel, result, poses);
      continue;
    } /*else if (pos > n) {
      // RCCOMB_DEBUG_PRINT("Invalid pos=%d > n=%d\n", pos, n);
      throw std::runtime_error("Invalid state");
    }*/

    int max_next_size = n - pos;

    int last_size = pos;
    if (poses.size() >= 2) {
      last_size -= poses[poses.size() - 2];
    }
    if (max_next_size > last_size) {
      max_next_size = last_size;
    }

    for (int next_size = max_next_size; next_size >= 1; next_size--) {
      std::vector<int> new_poses = poses;
      new_poses.push_back(pos + next_size);
      stack.push(new_poses);
      // RCCOMB_DEBUG_PRINT("pushed : %d, stack.size()=%d\n", next_size,
      //                    static_cast<int>(stack.size()));
    }
  }

  RCCOMB_DEBUG_PRINT("Generated %d topologies for n=%d, parallel=%d\n",
                     static_cast<int>(result.size()), n, parallel ? 1 : 0);
  topologies[key] = result;
  return topologies[key];
}

void test_collect_topologies(bool parallel, std::vector<TestTopology>& topos,
                             const std::vector<int>& poses) {
  // RCCOMB_DEBUG_PRINT("Collecting topologies: parallel=%d, poses.size()=%d\n",
  //                    parallel ? 1 : 0, static_cast<int>(poses.size()));

  std::vector<std::vector<TestTopology>> parts;
  int num_leafs = 0;
  for (int p : poses) {
    int size = p - num_leafs;
    parts.push_back(test_get_topology(!parallel, size));
    num_leafs = p;
  }

  std::vector<size_t> indices(poses.size(), 0);
  while (indices[poses.size() - 1] < parts[poses.size() - 1].size()) {
    std::vector<TestTopology> children(poses.size());
    for (size_t i = 0; i < poses.size(); i++) {
      children[i] = parts[i][indices[i]];
    }
    topos.push_back(create_test_topology(parallel, num_leafs, children));

    for (size_t i = 0; i < poses.size(); i++) {
      indices[i]++;
      if (indices[i] < parts[i].size()) {
        break;
      } else if (i + 1 >= poses.size()) {
        break;
      } else {
        indices[i] = 0;
      }
    }
  }
}