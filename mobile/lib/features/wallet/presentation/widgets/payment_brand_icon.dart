import 'package:flutter/material.dart';
import '../../domain/wallet_models.dart';

/// Authentic Brand Icon Widgets for MTN Mobile Money, Airtel Money, and Cards.
/// No third-party gateway branding is exposed to end users.
class PaymentBrandIcon extends StatelessWidget {
  final PaymentMethodType method;
  final double size;
  final double? borderRadius;

  const PaymentBrandIcon({
    super.key,
    required this.method,
    this.size = 32,
    this.borderRadius,
  });

  const PaymentBrandIcon.mtn({
    super.key,
    this.size = 32,
    this.borderRadius,
  }) : method = PaymentMethodType.mtnMobileMoney;

  const PaymentBrandIcon.airtel({
    super.key,
    this.size = 32,
    this.borderRadius,
  }) : method = PaymentMethodType.airtelMoney;

  const PaymentBrandIcon.card({
    super.key,
    this.size = 32,
    this.borderRadius,
  }) : method = PaymentMethodType.card;

  const PaymentBrandIcon.forMethod(
    this.method, {
    super.key,
    this.size = 32,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    switch (method) {
      case PaymentMethodType.mtnMobileMoney:
        return _buildMtnIcon(size, borderRadius);
      case PaymentMethodType.airtelMoney:
        return _buildAirtelIcon(size, borderRadius);
      case PaymentMethodType.card:
        return _buildCardIcon(size, borderRadius);
      case PaymentMethodType.meshInternal:
        return _buildMeshIcon(size, borderRadius);
    }
  }

  /// Authentic MTN Mobile Money brand badge (Yellow background + Black oval + bold italic MTN)
  static Widget _buildMtnIcon(double size, double? radius) {
    final br = radius ?? (size * 0.24);
    final ovalWidth = size * 0.82;
    final ovalHeight = size * 0.56;
    final strokeWidth = (size * 0.05).clamp(1.2, 2.5);
    final fontSize = (size * 0.30).clamp(7.0, 24.0);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFFFCC00), // MTN Signature Yellow
        borderRadius: BorderRadius.circular(br),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFFCC00).withValues(alpha: 0.3),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: ovalWidth,
          height: ovalHeight,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.all(Radius.elliptical(ovalWidth, ovalHeight)),
            border: Border.all(
              color: const Color(0xFF000000),
              width: strokeWidth,
            ),
          ),
          child: Center(
            child: Text(
              'MTN',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: const Color(0xFF000000),
                fontWeight: FontWeight.w900,
                fontSize: fontSize,
                fontStyle: FontStyle.italic,
                letterSpacing: -0.6,
                height: 1.0,
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Authentic Airtel Money brand badge (Red background + White flowing ribbon 'a' emblem)
  static Widget _buildAirtelIcon(double size, double? radius) {
    final br = radius ?? (size * 0.24);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFE40000), // Airtel Signature Red
        borderRadius: BorderRadius.circular(br),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFE40000).withValues(alpha: 0.3),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Center(
        child: SizedBox(
          width: size * 0.72,
          height: size * 0.72,
          child: const CustomPaint(
            painter: AirtelLogoPainter(color: Colors.white),
          ),
        ),
      ),
    );
  }

  /// Card Payment brand badge (Mastercard dual circles + sleek card styling)
  static Widget _buildCardIcon(double size, double? radius) {
    final br = radius ?? (size * 0.24);
    final circleDiameter = size * 0.42;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(br),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 1),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Mastercard interlocking circles
          Positioned(
            left: (size / 2) - circleDiameter * 0.82,
            child: Container(
              width: circleDiameter,
              height: circleDiameter,
              decoration: const BoxDecoration(
                color: Color(0xFFEB001B), // Mastercard Red
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            right: (size / 2) - circleDiameter * 0.82,
            child: Container(
              width: circleDiameter,
              height: circleDiameter,
              decoration: BoxDecoration(
                color: const Color(0xFFF79E1B).withValues(alpha: 0.88), // Mastercard Yellow/Orange
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Mesh internal protocol icon
  static Widget _buildMeshIcon(double size, double? radius) {
    final br = radius ?? (size * 0.24);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(br),
      ),
      child: Icon(
        Icons.hub_outlined,
        color: const Color(0xFF8B5CF6),
        size: size * 0.55,
      ),
    );
  }
}

/// Custom painter for the signature Airtel flowing ribbon curve
class AirtelLogoPainter extends CustomPainter {
  final Color color;

  const AirtelLogoPainter({this.color = Colors.white});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final strokeW = (w * 0.16).clamp(1.5, 4.0);

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    // Signature Airtel ribbon path
    path.moveTo(w * 0.30, h * 0.74);
    path.cubicTo(w * 0.14, h * 0.56, w * 0.16, h * 0.28, w * 0.48, h * 0.22);
    path.cubicTo(w * 0.76, h * 0.18, w * 0.88, h * 0.36, w * 0.84, h * 0.56);
    path.cubicTo(w * 0.80, h * 0.74, w * 0.58, h * 0.82, w * 0.40, h * 0.74);
    path.cubicTo(w * 0.28, h * 0.66, w * 0.32, h * 0.48, w * 0.52, h * 0.46);
    path.cubicTo(w * 0.68, h * 0.44, w * 0.78, h * 0.56, w * 0.76, h * 0.74);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant AirtelLogoPainter oldDelegate) => oldDelegate.color != color;
}

/// Pill Badge with authentic Brand Icon and label for the wallet screens
class PaymentBrandBadge extends StatelessWidget {
  final PaymentMethodType method;
  final String label;

  const PaymentBrandBadge({
    super.key,
    required this.method,
    required this.label,
  });

  const PaymentBrandBadge.mtn({
    super.key,
    this.label = 'MTN Mobile Money',
  }) : method = PaymentMethodType.mtnMobileMoney;

  const PaymentBrandBadge.airtel({
    super.key,
    this.label = 'Airtel Money',
  }) : method = PaymentMethodType.airtelMoney;

  const PaymentBrandBadge.card({
    super.key,
    this.label = 'Visa / Mastercard',
  }) : method = PaymentMethodType.card;

  @override
  Widget build(BuildContext context) {
    Color borderColor;
    switch (method) {
      case PaymentMethodType.mtnMobileMoney:
        borderColor = const Color(0xFFFFCC00).withValues(alpha: 0.35);
        break;
      case PaymentMethodType.airtelMoney:
        borderColor = const Color(0xFFE40000).withValues(alpha: 0.35);
        break;
      case PaymentMethodType.card:
        borderColor = const Color(0xFF00E5FF).withValues(alpha: 0.35);
        break;
      case PaymentMethodType.meshInternal:
        borderColor = Colors.grey.withValues(alpha: 0.35);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF131D26),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          PaymentBrandIcon(method: method, size: 18, borderRadius: 4),
          const SizedBox(width: 7),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
