# Zoop Mobile UI Specification

## 1. Purpose

The Zoop Mobile application is the primary mobile interface for using Zoop from Android and iOS.

The application combines:

* Zoop identity management
* Device management
* Connectivity
* Provider functionality
* Recipient functionality
* Connection monitoring
* Sharing management
* Security
* Privacy
* Future payment functionality

The application must feel like **Zoop**, not like a conventional VPN application.

Zoop is a connectivity platform. The interface should communicate relationships between people, devices, and networks rather than presenting the product as a simple VPN on/off switch.

---

# 2. Platforms

The mobile application targets:

* Android
* iOS

The UI is implemented using **Flutter**.

Platform-specific networking functionality remains implemented through the appropriate native Android and iOS interfaces.

Flutter owns the product interface and interaction model.

---

# 3. Design Philosophy

The Zoop mobile experience should be:

* Modern
* Minimal
* Distinctive
* Fast
* Calm
* Trustworthy
* Technical without being complicated
* Privacy-conscious
* Easy for first-time users
* Powerful for advanced users

The interface must not resemble a traditional VPN application.

Avoid:

* Giant VPN ON/OFF switches as the primary experience
* Generic VPN server lists
* Excessive cards
* Excessive gradients
* Dense dashboards
* Unnecessary technical terminology
* Fake networking statistics
* Decorative UI without purpose

Zoop should feel like a **connectivity network**, not a VPN utility.

---

# 4. Brand Language

The UI should use the existing Zoop visual identity.

Primary characteristics:

* Deep dark surfaces
* Strong typography
* Blue, cyan, and green accents
* Flat surfaces
* High contrast
* Subtle borders
* Controlled use of color
* Small amounts of motion
* Strong visual hierarchy

The Zoop orbital/node concept should influence:

* Connection indicators
* Device relationships
* Network states
* Provider/Recipient relationships
* Loading states
* Transitions

The visual language should be recognizable even when the Zoop logo is not visible.

---

# 5. Application Structure

Primary navigation:

```text
Home
Connections
Sharing
Devices
Settings
```

Secondary screens are opened from these sections.

The navigation must remain simple.

The user should not need to understand the internal Zoop architecture to operate the application.

---

# 6. First Launch

## 6.1 Welcome

### Purpose

Introduce Zoop to a new user.

### Content

* Zoop branding
* Short explanation of Zoop
* Privacy-oriented message
* Create Zoop ID
* Existing Zoop ID option

### Interaction

Primary action:

**Create Zoop ID**

Secondary action:

**I already have a Zoop ID**

### Design

The screen should be visually strong and simple.

It should establish the Zoop identity immediately rather than looking like a generic registration screen.

---

# 7. Identity Screens

## 7.1 Create Zoop ID

### Purpose

Create the user's Zoop identity.

### Content

* Username
* Username availability
* Zoop ID generation
* Zoop PIN creation
* PIN confirmation
* Privacy information

### Result

The user receives:

```text
Zoop ID
ZP-XXXXXXXX
```

and a username:

```text
@username
```

The Zoop ID is permanent.

The username may be changeable according to platform rules.

---

## 7.2 Zoop ID

### Purpose

Show the user's identity.

### Content

* Zoop ID
* Username
* Account status
* Device count
* Identity information
* Security entry point

### Important

The Zoop ID should be visually important.

It represents the user's identity within Zoop.

---

## 7.3 Sign In

### Purpose

Authenticate an existing Zoop identity.

### Content

* Zoop ID
* Zoop PIN
* Continue
* Recovery option

The user should not be asked for unnecessary personal information.

---

## 7.4 Zoop PIN

### Purpose

Create, change, or verify the user's Zoop PIN.

### Behavior

The PIN should not be requested every time the application opens.

It is primarily used for:

* Authentication
* Sensitive actions
* Device registration
* Security changes
* Future financial authorization

The interface should make PIN entry quick and low-friction.

---

# 8. Device Registration

## 8.1 Register This Device

### Purpose

Connect the current Android or iOS device to a Zoop identity.

### Content

* Device name
* Device type
* Zoop identity
* Registration status
* Security status
* Confirmation

The device generates its own device credential.

The user's identity credential must not simply be copied between devices.

---

## 8.2 Add Device

### Purpose

Add another device to the Zoop identity.

### Methods

The UI may support:

* QR pairing
* Zoop ID authentication
* Device invitation

### Goal

Device registration should be simple enough for a non-technical user.

---

# 9. Home

## Purpose

The Home screen is the primary Zoop experience.

It communicates:

* Current Zoop state
* Current connectivity
* Current role
* Important activity
* Device status
* Quick actions

It should not look like a VPN control panel.

---

## 9.1 Home States

The Home screen must support:

### Not connected

Explain that the device is currently not using a Zoop connection.

Provide an appropriate next action.

### Connecting

Show that Zoop is establishing connectivity.

Use subtle motion.

### Connected

Show:

* Connected Provider or network relationship
* Connection state
* Direct or relay path
* Duration
* Relevant connection information

### Reconnecting

Explain that Zoop is attempting to recover connectivity.

### Connection failed

Explain the failure in human language and provide recovery options.

### Sharing

If the user is acting as a Provider, show that their device is currently sharing connectivity.

---

# 10. Home Visual Model

The Home screen should visually represent the user's current position in Zoop.

For example:

```text
Your Device
     │
     │
Zoop Connection
     │
     │
Provider / Recipient
```

The actual implementation should use the Zoop visual language rather than a literal technical diagram.

The goal is to make the relationship understandable at a glance.

---

# 11. Connections

## Purpose

Manage the user's active and available connectivity relationships.

### Content

* Active connections
* Available authorized connections
* Provider identity
* Recipient identity
* Connection status
* Direct/relay state
* Duration
* Connection quality

Connections should feel like relationships rather than VPN servers.

---

# 12. Connection Details

### Purpose

Provide detailed information about a connection.

### Content

* Connection participants
* Device identities
* Connection state
* Path type
* Direct/relay status
* Duration
* Latency
* Packet loss
* Usage
* Recent connection events
* Disconnect

Technical details should be progressively disclosed.

Ordinary users should see a simple explanation first.

Advanced information can be expanded.

---

# 13. Providers

## Purpose

Show connectivity Providers available to the user.

### Content

* Provider username
* Provider/device
* Availability
* Connection quality
* Trust information
* Connection action

Providers should not be presented like anonymous VPN servers.

The relationship should feel understandable and intentional.

---

# 14. Provider Details

### Purpose

Show information before connecting to a Provider.

### Content

* Provider identity
* Username
* Device
* Availability
* Connection quality
* Sharing status
* Trust information
* Connect

The screen should help users make an informed connection decision.

---

# 15. Sharing

## Purpose

Control Provider functionality.

### Content

* Sharing status
* Current recipients
* Sharing activity
* Usage
* Sharing controls
* Requests

The main control should communicate:

> **Share my connectivity**

rather than:

> VPN ON

---

# 16. Sharing Requests

### Purpose

Handle requests from potential Recipients.

### Content

* Requester identity
* Requesting device
* Request status
* Requested access
* Approve
* Reject
* Block

Requests should be understandable without networking knowledge.

---

# 17. Recipient Details

### Purpose

Manage a person/device using shared connectivity.

### Content

* Recipient identity
* Device
* Connection state
* Usage
* Access permissions
* Connection history
* Revoke access

---

# 18. Sharing Policies

### Purpose

Control how the user's connectivity can be shared.

### Content

* Who can connect
* Allowed devices
* Access permissions
* Usage restrictions
* Sharing limits
* Provider availability

Policies should use simple language.

Avoid exposing raw firewall or networking terminology unless the user enters an advanced section.

---

# 19. Devices

## Purpose

Manage all devices owned by the Zoop identity.

### Content

* Device list
* Device names
* Device types
* Online/offline state
* Provider/Recipient capability
* Last activity
* Security state
* Add device

---

# 20. Device Details

### Purpose

Manage an individual device.

### Content

* Device name
* Device ID
* Device type
* Zoop identity
* Status
* Capabilities
* Registration date
* Last seen
* Security state
* Revoke
* Remove

---

# 21. Activity

## Purpose

Show meaningful events occurring within Zoop.

### Events

Examples:

* Device registered
* Connection established
* Connection disconnected
* Direct connection established
* Relay activated
* Connection recovered
* Sharing started
* Recipient connected
* Device revoked

The Activity interface should prioritize meaningful information.

It must not become a raw developer log.

---

# 22. Activity Details

### Purpose

Explain an individual event.

### Content

* Event type
* Time
* Device
* Connection
* Participants
* Result
* Relevant technical information

---

# 23. Diagnostics

## Purpose

Provide advanced networking information.

### Content

* Network availability
* Endpoint reachability
* Direct connectivity
* Relay status
* Latency
* Packet loss
* Connection attempts
* Recovery events
* Tunnel state

Diagnostics should be hidden from the primary experience.

The user enters Diagnostics when they want to understand a problem.

---

# 24. Security

## Purpose

Manage identity and device security.

### Content

* Zoop ID
* PIN
* Registered devices
* Active sessions
* Security events
* Device revocation
* Recovery

---

# 25. Device Security

### Purpose

Protect individual devices.

### Content

* Device credential state
* Registration status
* Last authentication
* Security events
* Revoke device

---

# 26. Account Recovery

## Purpose

Provide a method for recovering access to a Zoop identity.

Zoop intentionally does not require email or phone numbers.

Therefore recovery must be designed as an independent security system.

The recovery experience must clearly explain:

* Recovery method
* What information is required
* Security consequences
* Identity protection

Recovery must never expose another user's identity or credentials.

---

# 27. Privacy

## Purpose

Show users what Zoop knows and why.

### Content

* Account information
* Device information
* Network metadata
* Usage information
* Analytics controls
* Data management
* Privacy explanation

The language should be simple and transparent.

---

# 28. Organizations

## Purpose

Allow a Zoop identity to participate in organizations.

### Content

* Organizations
* Organization roles
* Membership
* Invitations
* Organization devices
* Organization connections

---

# 29. Organization Details

### Purpose

Provide organization-level information.

### Content

* Organization identity
* User role
* Members
* Devices
* Connections
* Policies
* Usage
* Organization settings

Advanced organization administration may remain Web-only.

---

# 30. Settings

## Purpose

Provide general application and account configuration.

### Sections

* Account
* Zoop Identity
* Security
* Devices
* Notifications
* Network
* Privacy
* Appearance
* Support
* About

---

# 31. Notifications

### Purpose

Control important Zoop notifications.

### Notification categories

* Connection events
* Sharing requests
* Device events
* Security events
* Organization events

Notifications should prioritize events that require action.

---

# 32. About

### Purpose

Provide product and system information.

### Content

* Zoop version
* Agent version
* Platform
* Legal information
* Open-source information where applicable
* Support
* Diagnostics

---

# 33. Future Payment Screens

Payment functionality is not required for the initial networking implementation but the architecture must support it.

Future screens may include:

## Zoop Balance

Shows:

* Available balance
* Pending balance
* Recent transactions
* Earnings

## Add Funds

Allows users to:

* Select amount
* Select payment method
* Confirm
* View transaction status

## Provider Earnings

Shows:

* Connectivity provided
* Earnings
* Pending earnings
* Available earnings
* Withdrawals

## Transactions

Shows:

* Payments
* Connectivity purchases
* Provider earnings
* Fees
* Withdrawals

Payment functionality must remain separate from Zoop identity.

---

# 34. Error States

Every major screen must have designed states for:

* Loading
* Empty
* Offline
* Authentication failure
* Permission failure
* Network failure
* Server failure
* Connection failure
* Recovery
* Success

Errors must explain what happened and what the user can do next.

---

# 35. Empty States

Empty states should not simply say:

> Nothing here.

They should explain the purpose of the section and provide a useful next action.

Examples:

* No devices → Add your first device
* No connections → Find or connect to a Provider
* No recipients → Share your connectivity
* No organizations → Create or join an organization

---

# 36. Mobile Navigation

Primary navigation:

```text
Home
Connections
Sharing
Devices
Settings
```

Secondary features should be reached contextually.

The application should avoid excessive navigation tabs.

---

# 37. Responsive Design

The same design system must work across:

* Small Android phones
* Large Android phones
* iPhones
* Different aspect ratios
* Small and large text settings
* Light and dark system configurations if supported

The interface must not depend on one specific phone size.

---

# 38. Accessibility

The application must support:

* Accessible text sizes
* Screen readers
* Sufficient contrast
* Touch targets
* Reduced motion
* Clear focus states
* Meaningful labels
* Non-color-only status indicators

Connection state must never be communicated through color alone.

---

# 39. Motion

Motion should be subtle and purposeful.

Use animation for:

* Connection establishment
* Connection recovery
* Device registration
* State transitions
* Network activity

Avoid:

* Constant animation
* Decorative motion
* Distracting effects

Motion should make Zoop feel alive without making it feel like a game.

---

# 40. Technical Information

Zoop has complex networking underneath the interface.

The UI should progressively expose that complexity.

### Normal user

Sees:

> Connected directly

### Advanced user

Can inspect:

> Direct path
> Latency
> Packet loss
> Endpoint state
> Connection events

The application should never force users to understand networking terminology just to use Zoop.

---

# 41. Core Product Principle

The Zoop mobile application must answer three questions immediately:

1. **What is happening?**
2. **Who or what am I connected to?**
3. **What can I do next?**

Everything else should remain secondary.

---

# 42. Design Principle

Zoop should not feel like:

> "A VPN app with some extra features."

It should feel like:

> **"My interface to the Zoop connectivity network."**

The design should communicate people, devices, relationships, trust, and connectivity.

---

# 43. Implementation Direction

The mobile UI will be implemented in:

**Flutter**

The mobile application will communicate with the Zoop Control Plane through the defined Zoop API.

Platform-specific functionality will integrate with:

* Android networking APIs
* Android VPN/network interfaces
* iOS Network Extension APIs
* Secure platform storage
* Background execution mechanisms

The Flutter application owns the user experience while the platform-specific Agent components handle actual networking functionality.

---

# 44. Design Deliverable

Before implementation, the design process should produce a complete Zoop Mobile Design System containing:

* Color tokens
* Typography
* Spacing
* Icons
* Buttons
* Inputs
* Navigation
* Device components
* Connection components
* Provider components
* Recipient components
* Status components
* Dialogs
* PIN components
* Loading states
* Empty states
* Error states
* Success states
* Motion guidelines
* Accessibility guidelines

All screens should be constructed from this design system rather than designed independently.

---

# 45. Final Experience

The final Zoop mobile application should be:

**Simple enough for anyone to use.**

**Powerful enough for advanced users.**

**Distinct enough to feel like Zoop.**

**Transparent enough that users understand what is happening.**

**Private enough that users do not feel forced to surrender unnecessary personal information.**

The application is not merely a control panel for a VPN.

It is the mobile interface to the Zoop identity, device, connectivity, sharing, and network ecosystem.
