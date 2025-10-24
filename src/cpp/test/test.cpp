#include <rccomb/rccomb.hpp>

int main(int argc, char** argv) {
  rccomb::ValueSearchOptions options(
      rccomb::ComponentType::Resistor,
      rccomb::ValueList({100, 220, 470, 1000, 2200, 4700, 10000, 22000, 47000,
                         100000, 220000, 470000, 1000000}),
      100, 1000000, 5, 9000);
  auto combinations = rccomb::search_combinations(options);
  for (const auto& comb : combinations) {
    printf("Combination: value=%.2f Ohm, leafs=%d\n", comb->value,
           comb->num_leafs());
  }
  return 0;
}