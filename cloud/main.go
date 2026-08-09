package main

import (
	"fmt"

	"github.com/zoop-internet/zoop/packages/core"
)

func main() {
	fmt.Printf("Zoop Cloud Control Plane v%s\n", core.Version())
}
