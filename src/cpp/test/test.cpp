#include <chrono>
#include <cstdio>
#include <vector>

#include <rccomb/rccomb.hpp>

using namespace rccomb;

int main(int argc, char** argv) {
  std::vector<value_t> K10 = {10000};
  std::vector<value_t> E3 = {100,    220,    470,    1000,  2200,
                             4700,   10000,  22000,  47000, 100000,
                             220000, 470000, 1000000};

  {
    // ValueList series(K10);
    ValueList series(E3);
    // value_t target = 1000;
    //  value_t target = 4000;
    value_t target = 9000;
    // value_t target = 14000;
    //  int max_elements = 3;
    //  int max_elements = 4;
    int max_elements = 5;
    // int max_elements = 10;

    ValueSearchOptions options(ComponentType::Resistor, series, 100, 1000000,
                               max_elements, target);

    auto start = std::chrono::high_resolution_clock::now();
    auto combinations = search_combinations(options);
    auto end = std::chrono::high_resolution_clock::now();

    for (const auto& comb : combinations) {
      printf("%s\n", comb->to_string().c_str());
    }

    std::chrono::duration<double, std::milli> duration = end - start;
    printf("Search took %.2f ms\n", duration.count());
  }

  {
    ValueList series(E3);

    DividerSearchOptions options(ComponentType::Resistor, series, 3.3 / 5.0,
                                 10000, 100000, 2);
    auto start = std::chrono::high_resolution_clock::now();
    auto dividers = search_dividers(options);
    auto end = std::chrono::high_resolution_clock::now();

    for (const auto& div : dividers) {
      printf("%s\n", div->to_string().c_str());
    }

    std::chrono::duration<double, std::milli> duration = end - start;
    printf("Search took %.2f ms\n", duration.count());
  }

  return 0;
}