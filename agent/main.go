package main

import (
	"fmt"

	"github.com/zoop-internet/zoop/packages/core"
)

func main() {
	fmt.Printf("Zoop Agent v%s\n", core.Version())
}
