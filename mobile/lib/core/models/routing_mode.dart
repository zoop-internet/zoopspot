import 'package:flutter/material.dart';

enum RoutingMode {
  fullInternet,
  splitTunnel;

  String get label {
    switch (this) {
      case RoutingMode.fullInternet:
        return 'Full Internet Egress';
      case RoutingMode.splitTunnel:
        return 'Split Tunnel (Zoop Only)';
    }
  }

  String get description {
    switch (this) {
      case RoutingMode.fullInternet:
        return 'Routes all device internet traffic through provider (Exit Node)';
      case RoutingMode.splitTunnel:
        return 'Routes only Zoop 100.64.0.0/10 sharing traffic; local internet remains direct';
    }
  }

  IconData get icon {
    switch (this) {
      case RoutingMode.fullInternet:
        return Icons.public;
      case RoutingMode.splitTunnel:
        return Icons.alt_route;
    }
  }

  String get wireRouteParam {
    switch (this) {
      case RoutingMode.fullInternet:
        return 'full';
      case RoutingMode.splitTunnel:
        return 'split';
    }
  }
}
