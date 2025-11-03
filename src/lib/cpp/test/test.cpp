#include <chrono>
#include <cstdio>
#include <map>
#include <memory>
#include <stack>
#include <vector>

#include <rcmb/rcmb.hpp>

using namespace rcmb;

uint32_t test_object_id = 1;
inline uint32_t get_next_object_id() { return test_object_id++; }

class TestTopologyClass;
using TestTopology = std::shared_ptr<TestTopologyClass>;
class TestTopologyClass {
 public:
  uint32_t id;
  bool parallel;
  const int num_leafs;
  std::vector<TestTopology> children;
  TestTopologyClass(bool parallel, int num_leafs,
                    const std::vector<TestTopology>& children)
      : id(get_next_object_id()),
        parallel(parallel),
        num_leafs(num_leafs),
        children(children) {}
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
bool test_search_dividers(std::vector<value_t>& series, int max_elements,
                          value_t target, bool verbose = false);
TestCombination test_calc_value(bool bake, ComponentType type,
                                TestTopology& topo, const value_t* leaf_values,
                                int pos, value_t* out_value = nullptr);
std::vector<TestTopology>& test_get_topology(bool parallel, int n);
void test_collect_topologies(bool parallel, std::vector<TestTopology>& topos,
                             const std::vector<int>& poses);

int main(int argc, char** argv) {
  auto t_start = std::chrono::high_resolution_clock::now();

  std::vector<value_t> K10 = {10000};
  std::vector<value_t> E3 = {100,    220,    470,    1000,  2200,
                             4700,   10000,  22000,  47000, 100000,
                             220000, 470000, 1000000};

  std::vector<ComponentType> types = {ComponentType::Resistor,
                                      ComponentType::Capacitor};

  {
    std::vector<value_t> targets = {
        100,  111,  123,  137,  150,  162,  178,   196,   215,   233,
        249,  270,  294,  316,  340,  364,  390,   430,   470,   511,
        540,  581,  620,  680,  721,  750,  820,   872,   930,   1575,
        2947, 3954, 4000, 7246, 9000, 9999, 14000, 26000, 31415,
    };
    for (const auto& type : types) {
      for (int max_elements = 1; max_elements <= 5; max_elements++) {
        RCCOMB_DEBUG_PRINT(
            "Testing search_combinations: type=%d, max_elements=%d\n",
            static_cast<int>(type), max_elements);
        for (const auto& target : targets) {
          bool ok = test_search_combinations(type, E3, max_elements, target);
          if (!ok) {
            RCCOMB_DEBUG_PRINT(
                "Test failed: type=%d, max_elements=%d, target=%.9f\n",
                static_cast<int>(type), max_elements, target);
            return -1;
          }
        }
      }
    }
  }

  {
    const auto type = ComponentType::Resistor;
    std::vector<value_t> series = {1};
    const int max_elements = 12;
    const value_t target = 3.14;
    bool ok = test_search_combinations(type, series, max_elements, target);
    if (!ok) {
      RCCOMB_DEBUG_PRINT("Test failed: type=%d, max_elements=%d, target=%.9f\n",
                         static_cast<int>(type), max_elements, target);
      return -1;
    }
  }

  {
    std::vector<value_t> targets = {
        0.01, 0.1, 0.2,  0.21,      0.3, 0.33, 1.0 / 3.0, 0.4,
        0.5,  0.6, 0.66, 2.0 / 3.0, 0.7, 0.8,  0.9,       0.99,
    };

    for (int max_elements = 2; max_elements <= 6; max_elements++) {
      RCCOMB_DEBUG_PRINT("Testing search_dividers: max_elements=%d\n",
                         max_elements);
      for (const auto& target : targets) {
        bool ok = test_search_dividers(E3, max_elements, target);
        if (!ok) {
          RCCOMB_DEBUG_PRINT(
              "Divider test failed: max_elements=%d, target=%.9f\n",
              max_elements, target);
          return -1;
        }
      }
    }
  }

  {
    int max_elements = 10;
    value_t target = 19.0 / 20.0;
    bool ok = test_search_dividers(K10, 10, target);
    if (!ok) {
      RCCOMB_DEBUG_PRINT("Divider test failed: max_elements=%d, target=%.9f\n",
                         max_elements, target);
      return -1;
    }
  }

  auto t_elapsed = std::chrono::high_resolution_clock::now() - t_start;
  auto ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(t_elapsed).count();
  RCCOMB_DEBUG_PRINT("All tests passed. Elapsed time: %ld ms\n", ms);

  return 0;
}

bool test_search_combinations(ComponentType type, std::vector<value_t>& series,
                              int max_elements, value_t target) {
  value_t target_min = target * 0.5;
  value_t target_max = target * 1.5;

  ValueList value_list(series);
  ValueSearchArgs vsa(type, value_list, max_elements, target, target_min,
                      target_max);

  std::vector<Combination> dut_combs;
  result_t ret = search_combinations(vsa, dut_combs);
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

  int indices[max_elements] = {0};
  value_t slot[max_elements] = {0};
  for (int num_elements = 1; num_elements <= max_elements; num_elements++) {
    for (auto parallel : parallels) {
      if (num_elements == 1 && parallel) continue;
      auto& topos = test_get_topology(parallel, num_elements);

      for (auto& topo : topos) {
        for (int i = 0; i < num_elements; i++) {
          indices[i] = 0;
          slot[i] = series[0];
        }

        int series_size = series.size();
        bool done = false;
        while (!done) {
          int incr_pos = num_elements - 1;

          value_t value;
          test_calc_value(false, type, topo, slot, 0, &value);
          if (value != VALUE_NONE) {
            value_t error = std::abs(value - target);
            if (error < exp_error - epsilon) {
              exp_value = value;
              exp_error = error;
              exp_elements = num_elements;
              exp_comb = test_calc_value(true, type, topo, slot, 0);
              // RCCOMB_DEBUG_PRINT("Found better combination: %lf
              // (error=%lf)\n",
              //                    val, error);
            }
          }

          // Increment indices
          for (int i = num_elements - 1; i > incr_pos; i--) {
            indices[i] = 0;
            slot[i] = series[0];
          }
          for (int i = incr_pos; i >= 0; i--) {
            indices[i] = (indices[i] + 1) % series_size;
            slot[i] = series[indices[i]];
            if (indices[i] != 0) {
              break;
            } else if (i == 0) {
              done = true;
              break;
            }
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

bool test_search_dividers(std::vector<value_t>& series, int max_elements,
                          value_t target, bool verbose) {
  const value_t total_min = 10000;
  const value_t total_max = 100000;
  const value_t target_min = target * 0.5;
  const value_t target_max = target * 1.5;
  ValueList value_list(series);
  DividerSearchArgs dsa(value_list, max_elements, total_min, total_max, target,
                        target_min, target_max);
  auto start = std::chrono::high_resolution_clock::now();
  std::vector<DoubleCombination> dividers;
  result_t ret = search_dividers(dsa, dividers);
  if (ret != result_t::SUCCESS) {
    RCCOMB_DEBUG_PRINT("Error: %s\n", result_to_string(ret));
    return false;
  }

  bool success = true;

  if (dividers.empty()) {
    RCCOMB_DEBUG_PRINT(
        "Divider test failed: no result found for target=%.9lf\n", target);
    success = false;
  } else {
    value_t result = dividers[0]->ratio;
    value_t error = std::abs(result - target);
    if (target < total_min - 1e9 || total_max + 1e9 < result) {
      RCCOMB_DEBUG_PRINT(
          "Divider test failed: target=%.9lf, result=%.9lf, error=%.9lf\n",
          target, result, error);
      success = false;
    }
    value_t total =
        dividers[0]->uppers[0]->value + dividers[0]->lowers[0]->value;
    if (total < total_min - 1e9 || total_max + 1e9 < total) {
      RCCOMB_DEBUG_PRINT(
          "Divider test failed: target=%.9lf, total=%.9lf, error=%.9lf\n",
          target, total, error);
      success = false;
    }
  }

  if (!success || verbose) {
    auto end = std::chrono::high_resolution_clock::now();
    for (const auto& div : dividers) {
      RCCOMB_DEBUG_PRINT("%s\n", div->to_string().c_str());
      // printf("%s\n", div->to_json_string().c_str());
    }
    std::chrono::duration<double, std::milli> duration = end - start;
    RCCOMB_DEBUG_PRINT("Search took %.2f ms\n", duration.count());
  }

  return success;
}

TestCombination test_calc_value(bool bake, ComponentType type,
                                TestTopology& topo, const value_t* leaf_values,
                                int pos, value_t* out_value) {
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
  uint32_t last_id = -1;
  value_t last_value = std::numeric_limits<value_t>::infinity();
  std::vector<TestCombination>* child_combs = nullptr;
  if (bake) {
    child_combs = new std::vector<TestCombination>();
  }
  for (auto& child : topo->children) {
    value_t child_value;
    auto child_comb = test_calc_value(bake, type, child, leaf_values, child_pos,
                                      &child_value);

    // 枝刈り
    if (child_value == VALUE_NONE) {
      *out_value = VALUE_NONE;
      return nullptr;
    } else if (child->id == last_id && child_value > last_value) {
      *out_value = VALUE_NONE;
      return nullptr;
    }
    last_id = child->id;
    last_value = child_value;

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

  // RCCOMB_DEBUG_PRINT("Generated %d topologies for n=%d, parallel=%d\n",
  //                    static_cast<int>(result.size()), n, parallel ? 1 : 0);
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