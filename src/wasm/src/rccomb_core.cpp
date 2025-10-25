#include <cstdio>
#include <string>

#include <emscripten/bind.h>

#include "rccomb/rccomb.hpp"

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

// cType: ComponentType, values: number[], targetValue: number,
// maxElements: number): Combination[]
//

using namespace rccomb;

// 文字列を返す
std::string find_combinations(bool capacitor, const std::vector<double>& values,
                              double targetValue, int maxElements) {
  auto type = capacitor ? ComponentType::Capacitor : ComponentType::Resistor;
  std::vector<value_t> val_vec;
  for (const auto& v : values) {
    val_vec.push_back(static_cast<value_t>(v));
  }
  ValueList value_list(val_vec);

  value_t min = targetValue / 2;
  value_t max = targetValue * 2;
  ValueSearchOptions options(type, value_list, min, max, maxElements,
                             targetValue);

  auto combinations = rccomb::search_combinations(options);

  std::string result = "{\"result\":[";
  for (size_t i = 0; i < combinations.size(); i++) {
    const auto& comb = combinations[i];
    if (i > 0) {
      result += ",";
    }
    result += comb->to_json_string();
  }
  result += "]}";

  return result;
}

#if 1
void hello(bool flag, int i, const std::vector<double>& values) {
  std::printf("Hello from rccomb_core!, flag=%d, i=%d\n", flag ? 1 : 0, i);
  for (const double& n : values) {
    std::printf("  value: %f\n", n);
  }
}
#else
void hello(bool flag, int i, const double* values, int size) {
  std::printf("Hello from rccomb_core!, flag=%d, i=%d\n", flag ? 1 : 0, i);
  for (int idx = 0; idx < size; idx++) {
    std::printf("  value: %f\n", values[idx]);
  }
}
#endif

EMSCRIPTEN_BINDINGS(RccombCore) {
  emscripten::register_vector<double>("VectorDouble");
  emscripten::function("find_combinations", &find_combinations);
  emscripten::function("hello", &hello);
}
