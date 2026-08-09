package core

import "fmt"

// Version information for the Zoop system.
const (
	VersionMajor = 0
	VersionMinor = 1
	VersionPatch = 0
	VersionMeta  = "alpha"
)

// Version returns the full semver string of Zoop.
func Version() string {
	if VersionMeta != "" {
		return fmt.Sprintf("%d.%d.%d-%s", VersionMajor, VersionMinor, VersionPatch, VersionMeta)
	}
	return fmt.Sprintf("%d.%d.%d", VersionMajor, VersionMinor, VersionPatch)
}
