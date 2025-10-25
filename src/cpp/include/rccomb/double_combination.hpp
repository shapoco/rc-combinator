#ifndef RCCOMB_DOUBLE_COMBINATION_HPP
#define RCCOMB_DOUBLE_COMBINATION_HPP

#include <memory>
#include <vector>

#include "rccomb/combination.hpp"
#include "rccomb/common.hpp"

namespace rccomb {

class DoubleCombinationClass;
using DoubleCombination = std::shared_ptr<DoubleCombinationClass>;

class DoubleCombinationClass {
 public:
  const value_t ratio;
  std::vector<Combination> uppers;
  std::vector<Combination> lowers;

  DoubleCombinationClass(value_t ratio) : ratio(ratio) {}

  std::string to_json_string() const;

#ifdef RCCOMB_DEBUG
  inline std::string to_string() const {
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
};

inline DoubleCombination create_double_combination(value_t ratio) {
  return std::make_shared<DoubleCombinationClass>(ratio);
}

#ifdef RCCOMB_IMPLEMENTATION

std::string DoubleCombinationClass::to_json_string() const {
  std::string s = "{";
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
  s += "],";
  s += "}";
  return s;
}
#endif

}  // namespace rccomb

#endif