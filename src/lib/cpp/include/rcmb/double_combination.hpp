#ifndef RCCOMB_DOUBLE_COMBINATION_HPP
#define RCCOMB_DOUBLE_COMBINATION_HPP

#include <memory>
#include <vector>

#include "rcmb/combination.hpp"
#include "rcmb/common.hpp"

namespace rcmb {

class DoubleCombinationClass;
using DoubleCombination = std::shared_ptr<DoubleCombinationClass>;

class DoubleCombinationClass {
 public:
  const value_t ratio;
  std::vector<Combination> uppers;
  std::vector<Combination> lowers;

  DoubleCombinationClass(value_t ratio) : ratio(ratio) {}

  result_t verify() const;
  std::string to_json_string() const;
  std::string to_string() const;
};

inline DoubleCombination create_double_combination(value_t ratio) {
  return std::make_shared<DoubleCombinationClass>(ratio);
}

#ifdef RCCOMB_IMPLEMENTATION

result_t DoubleCombinationClass::verify() const {
  if (uppers.empty() || lowers.empty()) {
    return result_t::BROKEN_TOPOLOGY;
  }

  value_t upper = -1;
  for (const auto &comb : uppers) {
    result_t ret = comb->verify();
    if (ret != result_t::SUCCESS) {
      return ret;
    }
    if (upper == -1) {
      upper = comb->value;
    } else {
      value_t error = std::abs(upper - comb->value);
      if (error > upper / 1e9) {
        return result_t::INACCURATE_RESULT;
      }
    }
  }

  value_t lower = -1;
  for (const auto &comb : lowers) {
    result_t ret = comb->verify();
    if (ret != result_t::SUCCESS) {
      return ret;
    }
    if (lower == -1) {
      lower = comb->value;
    } else {
      value_t error = std::abs(lower - comb->value);
      if (error > lower / 1e9) {
        return result_t::INACCURATE_RESULT;
      }
    }
  }

  value_t computed_ratio = lower / (upper + lower);
  value_t error = std::abs(computed_ratio - ratio);
  if (error > 1e9) {
    return result_t::INACCURATE_RESULT;
  }

  return result_t::SUCCESS;
}

std::string DoubleCombinationClass::to_json_string() const {
  std::string s = "{";
  s += std::string("\"ratio\":\"") + value_to_json_string(ratio) + "\",";
  s += std::string("\"uppers\":[");
  for (size_t i = 0; i < uppers.size(); i++) {
    s += uppers[i]->to_json_string();
    if (i + 1 < uppers.size()) {
      s += ",";
    }
  }
  s += "],";
  s += std::string("\"lowers\":[");
  for (size_t i = 0; i < lowers.size(); i++) {
    s += lowers[i]->to_json_string();
    if (i + 1 < lowers.size()) {
      s += ",";
    }
  }
  s += "]";
  s += "}";
  return s;
}

std::string DoubleCombinationClass::to_string() const {
  std::string s;
  s += "ratio:" + std::to_string(ratio) + "\n";
  s += "  uppers:\n";
  for (size_t i = 0; i < uppers.size(); i++) {
    s += "    " + uppers[i]->to_string() + "\n";
  }
  s += "  lowers:\n";
  for (size_t i = 0; i < lowers.size(); i++) {
    s += "    " + lowers[i]->to_string() + "\n";
  }
  return s;
}

#endif

}  // namespace rcmb

#endif