# Zoop Identity

## 1. Purpose

Zoop Identity provides the identity layer for the Zoop platform.

A user should be able to use Zoop without being required to provide an email address, phone number, or real-world identity.

The identity system is built around a **Zoop ID** that belongs to the user and remains independent from any future payment system.

---

## 2. Zoop Identity

Every Zoop user receives a unique permanent identifier.

Example:

```text
Zoop ID: ZP-7K4M9X
Username: @alex
```

The two identifiers have different purposes.

### Zoop ID

The Zoop ID is the user's permanent platform identity.

It is:

- Unique
- Permanent
- Not normally changeable
- Used internally to identify ownership and relationships
- Independent of email and phone numbers

### Username

The username is the human-readable identity.

Example:

```
@alex
```

It can be used when discovering or sharing a Zoop identity.

A username may be changed according to Zoop's rules without changing the underlying Zoop ID.

## 3. Authentication

Zoop does not require:

- Email addresses
- Phone numbers
- Social accounts
- Real names

The primary user authentication mechanism is the Zoop PIN.

The Zoop PIN is a six-digit credential created by the user.

The PIN is not intended to be entered every time the user opens Zoop.

## 4. Device Authentication

Each device registered to a Zoop identity receives its own secure device credential.

Supported devices may include:

- Android
- iOS
- Desktop
- Router

The device credential is stored securely using the platform's available secure storage mechanisms.

The device credential is separate from the user's Zoop PIN.

```
Zoop Identity
│
├── Zoop ID
├── Username
├── Zoop PIN
│
└── Devices
    ├── Android
    ├── iOS
    ├── Desktop
    └── Router
```

This allows individual devices to be revoked without destroying the user's entire Zoop identity.

## 5. Normal Authentication Experience

During initial setup:

1. Create Zoop identity
2. Receive Zoop ID
3. Choose username
4. Create Zoop PIN
5. Register the device
6. Secure the device credential

After setup, the device can maintain the user's authenticated session.

The user should not repeatedly enter their PIN during ordinary Zoop usage.

## 6. Sensitive Operations

The Zoop PIN may be required again when performing sensitive actions.

Examples include:

- Registering a new device
- Removing a device
- Revoking a device
- Changing important security settings
- Changing sharing permissions
- Approving sensitive Provider/Recipient operations
- Accessing sensitive account information
- Authorizing financial operations when payments are introduced

The system must use rate limiting and other protections against repeated PIN attempts.

## 7. Identity and Privacy

Zoop follows a minimal-data principle.

Creating a Zoop identity should not require the user to provide:

- Email
- Phone number
- Real name
- Physical address
- Social-media account

Zoop should only collect information required for operating and securing the platform.

Because email and phone numbers are not required, account recovery must be designed carefully without silently introducing mandatory personal information.

## 8. Identity and Devices

A single Zoop identity can control multiple devices.

```
ZP-7K4M9X
│
├── Android
├── iPhone
├── Windows PC
├── Linux PC
└── Router
```

The user can:

- View devices
- Register devices
- Rename devices
- See device status
- Revoke devices
- Remove devices

Revoking one device must not invalidate the entire Zoop identity.

## 9. Identity and Zoop Networking

Zoop Identity is separate from network connectivity.

The identity system determines who owns and controls a resource.

The Zoop Agent determines how the device participates in the network.

The Control Plane uses Zoop identities to establish:

- Device ownership
- Provider relationships
- Recipient relationships
- Connection authorization
- Organization membership
- Security policies

The Data Plane does not use usernames as network credentials.

## 10. Identity and Organizations

A Zoop identity can belong to one or more organizations.

```
Zoop Identity
│
├── Personal Zoop
│
└── Organizations
    ├── Organization A
    └── Organization B
```

Organization membership does not replace the user's personal Zoop identity.

Organizations have their own identities and permissions within the Control Plane.

## 11. Future Payment System

Payments are intentionally separated from Zoop Identity.

A user can create and use Zoop without creating a payment account.

When payments are introduced, a separate financial layer can be associated with the Zoop identity.

```
Zoop Identity
│
├── Network Identity
│   ├── Devices
│   ├── Providers
│   └── Recipients
│
├── Organizations
│
└── Financial Layer
    ├── Balance
    ├── Transactions
    ├── Payments
    ├── Earnings
    └── Withdrawals
```

Payment functionality must not become a requirement for basic Zoop usage.

## 12. Zoop Balance

A future Zoop financial system may provide an internal balance.

Users may eventually be able to:

- Add funds
- Pay for connectivity
- Receive payments
- Earn from providing connectivity
- View transactions
- Withdraw earnings

The exact payment mechanisms are defined separately from the identity system.

## 13. Provider Earnings

The future payment architecture should support Providers earning value from sharing connectivity.

Conceptually:

```
Recipient
    │
    │ Payment
    ▼
Zoop Platform
    │
    ├── Zoop Fee
    │
    └── Provider Earnings
```

The financial layer remains separate from the networking identity layer.

## 14. Reputation

Zoop Identity may eventually provide a foundation for a reputation system.

Potential reputation information may include:

- Account age
- Device history
- Successful connections
- Provider reliability
- Recipient reliability
- Policy violations
- Abuse history
- Trust relationships

Reputation must be designed carefully so that it does not unnecessarily expose private user information.

## 15. Security Principles

Zoop Identity follows these principles:

1. Every identity has a unique Zoop ID.
2. Device identities are separate from user identities.
3. Sensitive credentials are never exposed through normal interfaces.
4. The Zoop PIN is protected against brute-force attempts.
5. Individual devices can be revoked.
6. Identity data is separated from payment data.
7. Network traffic is not used as an identity database.
8. Zoop minimizes unnecessary personal information.
9. Authentication and authorization are separate concepts.

## 16. Platform Support

The same Zoop identity system must work across:

- Android
- iOS
- Web
- Desktop
- Router

A user should be able to authenticate their Zoop identity and manage authorized devices across supported platforms.

## 17. Core Principle

Zoop ID is the user's identity inside Zoop, not their email address, phone number, or payment account.

The identity layer provides the foundation for:

- Devices
- Connectivity
- Sharing
- Organizations
- Security
- Reputation
- Future payments

Zoop Identity is therefore a foundational component of the platform rather than merely a login mechanism.
