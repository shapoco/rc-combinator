#ifndef RCCOMB_VALUE_LIST_HPP
#define RCCOMB_VALUE_LIST_HPP

#include "rccomb/common.hpp"

#include <algorithm>
#include <vector>

namespace rccomb {
class ValueList {
 public:
  const std::vector<value_t> values;

  ValueList(const std::vector<value_t>& vals) : values(sort_values(vals)) {}

  // todo: optimize
  const value_t* get_values(value_t min, value_t max, int* count) const {
    int i_start = -1;
    for (size_t i = 0; i < values.size(); i++) {
      if (values[i] >= min) {
        i_start = i;
        break;
      }
    }

    if (i_start < 0) {
      *count = 0;
      return nullptr;
    }

    int i_end = i_start;
    for (size_t i = i_start; i < values.size(); i++) {
      if (values[i] > max) {
        break;
      }
      i_end = i;
    }
    *count = i_end - i_start + 1;
    return &values[i_start];
  }
};

}  // namespace rccomb

#endif