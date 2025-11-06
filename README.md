# RC Combinator: 合成抵抗・合成容量 探索ツール

## ウェブアプリ (Web App)

合成抵抗や合成容量を計算するツールです。下のリンクからご利用ください。<br>
This is a tool for calculating combined resistance and combined capacitance. Please access it from the link below.<br>
[https://shapoco.github.io/rc-combinator/](https://shapoco.github.io/rc-combinator/)

## CLI コマンド (CLI Command)

```sh
cd src/pc/rcmb

# Build:
make -j

# Resistor Combination:
./bin/rcmb r -t 5.1k
# Target: 5.1k
#   5.1k <-- (10k//10k)--100

# Capacitor Combination:
./bin/rcmb c -t 3.14u
# Target: 3.14u
#   3.14u <-- 2.2u//470n//470n

# Voltage Divider:
./bin/rcmb d -s 10k -n 6 -t 0.3
# Target: 0.3
#   ratio: 0.3
#     R1:
#       23.3333333333k <-- (10k//10k//10k)--10k--10k
#     R2:
#       10k
#   ratio: 0.3
#     R1:
#       10k
#     R2:
#       4.28571428571k <-- (10k--10k--10k)//10k//10k
```

|Command Line|Description|
|:--|:--|
|`rcmb r -t <target> [options...]`|Resistor Combination|
|`rcmb c -t <target> [options...]`|Capacitor Combination|
|`rcmb d -t <target> [options...]`|Voltage Divider|

|Long Option|Short Option|Available Subcommand|
|:--|:--|:--|
|`--series`|`-s`|E-series or specific values|
|`--series-min`||minimum value of elements|
|`--series-max`||maximum value of elements|
|`--num-elems-min`||minimum number of elements|
|`--num-elems-max`|`-n`|minimum number of elements|
|`--target`|`-t`|target value|
|`--target-tol`|`-e`|target tolerance|
|`--target-tol-min`||minimum target error|
|`--target-tol-max`||maximum target error|
|`--total-min`||minimum total resistance of voltage divider|
|`--total-max`||maximum total resistance of voltage divider|
|`--format`|`-f`|output format (`text` or `json`)|