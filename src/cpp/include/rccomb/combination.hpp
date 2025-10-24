#ifndef RCCOMB_COMBINATION_HPP
#define RCCOMB_COMBINATION_HPP

#include "rccomb/common.hpp"
#include "rccomb/topology_node.hpp"

namespace rccomb {

class CombinationClass;
using Combination = std::shared_ptr<CombinationClass>;

class CombinationClass {
 public:
  const ComponentType type;
  const TopologyNode topology;
  const std::vector<Combination> children;
  const value_t value;

  CombinationClass(const TopologyNode &topology, ComponentType type,
                   const std::vector<Combination> &children, value_t val)
      : type(type), topology(topology), children(children), value(val) {}

  inline int num_leafs() const { return topology->num_leafs; }
};

static inline Combination create_combination(
    const TopologyNode &topology, ComponentType type,
    const std::vector<Combination> &children, value_t value) {
  return std::make_shared<CombinationClass>(topology, type, children, value);
}

}  // namespace rccomb

#endif  // RCCOMB_COMBINATION_HPP
