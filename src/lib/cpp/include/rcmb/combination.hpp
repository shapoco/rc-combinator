#ifndef RCCOMB_COMBINATION_HPP
#define RCCOMB_COMBINATION_HPP

#include <cmath>

#include "rcmb/common.hpp"
#include "rcmb/topology.hpp"

namespace rcmb {

class CombinationClass;
using Combination = std::shared_ptr<CombinationClass>;

class CombinationClass {
 public:
  const ComponentType type;
  const Topology topology;
  const std::vector<Combination> children;
  const value_t value;

  CombinationClass(const Topology &topology, ComponentType type,
                   const std::vector<Combination> &children, value_t val)
      : type(type), topology(topology), children(children), value(val) {}

  inline bool is_leaf() const { return topology->is_leaf(); }
  inline int num_leafs() const { return topology->num_leafs; }

  result_t verify() const;
  bool is_normalized() const;
  std::string to_json_string() const;
  std::string to_string() const;
};

static inline Combination create_combination(
    const Topology &topology, ComponentType type,
    const std::vector<Combination> &children, value_t value) {
  return std::make_shared<CombinationClass>(topology, type, children, value);
}

#ifdef RCCOMB_IMPLEMENTATION

// 値が正しいか確認
result_t CombinationClass::verify() const {
  if (is_leaf()) {
    return result_t::SUCCESS;
  }

  for (const auto &child : children) {
    result_t ret = child->verify();
    if (ret != result_t::SUCCESS) {
      return ret;
    }
  }

  bool inv_sum;
  if (type == ComponentType::Resistor) {
    inv_sum = topology->parallel;
  } else {
    inv_sum = !topology->parallel;
  }

  value_t accum = 0;
  for (const auto &child : children) {
    if (inv_sum) {
      if (child->value == 0) {
        accum = 0;
        break;
      }
      accum += 1 / child->value;
    } else {
      accum += child->value;
    }
  }
  accum = inv_sum ? (1 / accum) : accum;

  if (accum < 0) {
    return result_t::NEGATIVE_VALUE;
  }

  value_t error = std::abs(accum - value);
  if (error > accum / 1e9) {
    return result_t::INACCURATE_RESULT;
  }

  return result_t::SUCCESS;
}

// 正規化されているか確認 (重複回避のため)
bool CombinationClass::is_normalized() const {
  if (is_leaf()) return true;

  const value_t epsilon = value / 1e9;

  // 隣り合う同一トポロジの兄弟が降順になっているのを確認
  for (size_t i = 1; i < children.size(); i++) {
    const auto &prev = children[i - 1];
    const auto &curr = children[i];
    if (prev->topology->id == curr->topology->id) {
      if (prev->value + epsilon < curr->value) {
        return false;
      }
    }
  }

  // 子ノードも再帰的に確認
  for (const auto &child : children) {
    if (!child->is_normalized()) {
      return false;
    }
  }

  return true;
}

std::string CombinationClass::to_json_string() const {
  if (is_leaf()) {
    return value_to_json_string(value);
  } else {
    std::string s = "{";
    s += std::string("\"parallel\":") +
         (topology->parallel ? "true" : "false") + ",";
    s += std::string("\"value\":") + value_to_json_string(value) + ",";
    s += "\"children\":[";
    for (size_t i = 0; i < children.size(); i++) {
      s += children[i]->to_json_string();
      if (i + 1 < children.size()) {
        s += ",";
      }
    }
    s += "]}";
    return s;
  }
}

std::string CombinationClass::to_string() const {
  if (is_leaf()) {
    return std::to_string(value);
  } else {
    std::string s;
    for (size_t i = 0; i < children.size(); i++) {
      const auto &child = children[i];
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

#endif

}  // namespace rcmb

#endif  // RCCOMB_COMBINATION_HPP
