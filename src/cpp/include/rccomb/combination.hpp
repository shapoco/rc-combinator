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

  inline bool is_leaf() const { return topology->is_leaf(); }

  inline int num_leafs() const { return topology->num_leafs; }

  std::string to_json_string() const;

#ifdef RCCOMB_DEBUG
  inline std::string to_string() const {
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
          s += topology->parallel ? "||" : "--";
        }
      }
      s += "==>" + std::to_string(value);
      return s;
    }
  }
#endif
};

static inline Combination create_combination(
    const TopologyNode &topology, ComponentType type,
    const std::vector<Combination> &children, value_t value) {
  return std::make_shared<CombinationClass>(topology, type, children, value);
}

#ifdef RCCOMB_IMPLEMENTATION

std::string CombinationClass::to_json_string() const {
  if (is_leaf()) {
    return value_to_json_string(value);
  } else {
    std::string s = "{";
    s += std::string("\"parallel\":") +
         (topology->parallel ? "true" : "false") + ",";
    s += std::string("\"value\":\"") + value_to_json_string(value) + "\",";
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

#endif

}  // namespace rccomb

#endif  // RCCOMB_COMBINATION_HPP
