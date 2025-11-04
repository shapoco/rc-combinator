#ifndef RCMB_VALUE_LIST_HPP
#define RCMB_VALUE_LIST_HPP

#include "rcmb/common.hpp"

#include <algorithm>
#include <vector>

namespace rcmb {
class ValueList {
 public:
  const std::vector<value_t> values;

  ValueList(const std::vector<value_t>& vals) : values(sort_values(vals)) {}

  inline size_t size() const { return values.size(); }

  result_t validate() const {
    value_t prev_value = -1;
    for (const auto& v : values) {
      if (!value_is_valid(v)) {
        RCMB_DEBUG_PRINT("Invalid element in value list: %.9f\n", v);
        return result_t::INVALID_ELEMENT_VALUE_LIST;
      }
      if (v == prev_value) {
        RCMB_DEBUG_PRINT("Duplicate element in value list: %.9f\n", v);
        return result_t::INVALID_ELEMENT_VALUE_LIST;
      }
      prev_value = v;
    }
    return result_t::SUCCESS;
  }

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

  // todo: optimize
  const value_t* get_nearest(value_t target, int* count) const {
    value_t best_error = VALUE_POSITIVE_INFINITY;
    int best_index = -1;
    for (size_t i = 0; i < values.size(); i++) {
      value_t error = std::abs(values[i] - target);
      if (error < best_error) {
        best_error = error;
        best_index = i;
      }
    }
    *count = 1;
    return &values[best_index];
  }
};

}  // namespace rcmb

#endif