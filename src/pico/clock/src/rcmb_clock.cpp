#include <hardware/clocks.h>
#include <pico/stdlib.h>

#include <cstdio>
#include <string>
#include <vector>

#include <rcmb/rcmb.hpp>

const std::vector<rcmb::value_t> E3 = {
    100,   220,   470,    1000,   2200,   4700,    10000,
    22000, 47000, 100000, 220000, 470000, 1000000,
};

int main() {
  set_sys_clock_khz(250000, true);
  sleep_ms(100);

  stdio_init_all();
  sleep_ms(500);

  printf("RCMB Clock Example:\r\n");

  rcmb::ValueList series(E3);
  for (int t = 1; t <= 10; t++) {
    rcmb::value_t target = t * 100;
    rcmb::value_t min = target * 0.5;
    rcmb::value_t max = target * 1.5;
    int num_elements = 5;
    printf("Target: %s\r\n", rcmb::value_to_prefixed(target).c_str());
    rcmb::CombinationSearchArgs vsa(rcmb::ComponentType::Resistor, series, 1,
                                    num_elements, target, min, max);
    std::vector<rcmb::Combination> combs;
    rcmb::result_t res = rcmb::search_combinations(vsa, combs);
    if (res != rcmb::result_t::SUCCESS) {
      printf("Error: %s\r\n", rcmb::result_to_string(res));
      return -1;
    }
    for (const auto& comb : combs) {
      printf("  %s <-- %s\r\n", rcmb::value_to_prefixed(comb->value).c_str(),
             comb->to_string().c_str());
    }
  }
  return 0;
}
