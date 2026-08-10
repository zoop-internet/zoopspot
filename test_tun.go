package main

import (
	"fmt"
	"golang.zx2c4.com/wireguard/tun"
)

func main() {
	_, err := tun.CreateTUN("testtun0", 1420)
	if err != nil {
		fmt.Printf("Failed: %v\n", err)
	} else {
		fmt.Println("Success")
	}
}
