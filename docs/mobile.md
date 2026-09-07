# Zoop Mobile — Product Experience Specification

## 1. Overview

Zoop Mobile is the primary mobile interface for interacting with the Zoop platform on Android and iOS.

The mobile experience brings together Zoop identity, devices, connectivity, provider and recipient relationships, sharing, security, privacy, activity, diagnostics, organizations, and future financial functionality.

Zoop is fundamentally a **connectivity platform**, not simply a VPN application.

The mobile product should therefore help users understand and manage relationships between:

* people
* identities
* devices
* connections
* providers
* recipients
* networks
* organizations
* trust and access

The experience should make these relationships understandable without requiring users to understand the underlying networking architecture.

The goal is to create a mobile product that feels distinctly like Zoop rather than a conventional VPN client.

---

# 2. Purpose of This Specification

This document defines:

* product capabilities
* user outcomes
* functional requirements
* UX principles
* visual direction
* technical boundaries
* accessibility expectations
* behavioral expectations
* quality standards

It is intentionally **not a screen-by-screen UI specification**.

The implementation and design agent should not interpret this document as requiring a predetermined set of screens, layouts, navigation patterns, component arrangements, or interaction mechanisms.

There may be multiple valid ways to satisfy the requirements.

The agent should use product judgment, mobile UX best practices, accessibility principles, Android and iOS conventions, and the Zoop product model to determine the most effective implementation.

The objective is to produce the **best possible Zoop mobile experience**, not to reproduce a particular interface structure.

---

# 3. Design Freedom

The following principle applies throughout this specification.

> **Requirements describe what the product must accomplish, not necessarily how the interface must accomplish it.**

Unless a behavior is explicitly required by a functional, security, accessibility, or platform constraint, the implementation is free to determine:

* information architecture
* navigation model
* screen composition
* interaction patterns
* component selection
* information hierarchy
* content presentation
* transitions
* progressive disclosure mechanisms
* placement of actions
* visual composition

Do not create UI solely because a section of this document happens to describe a capability.

A capability may be represented through:

* a dedicated experience
* contextual UI
* an existing product surface
* a flow
* a modal or sheet
* a settings area
* a progressive disclosure pattern
* another interaction model

The appropriate solution should be selected based on usability and context.

The implementation should avoid unnecessarily multiplying screens simply to mirror this document.

---

# 4. Product Vision

Zoop should feel like a user's interface to a living connectivity network.

The product should communicate:

* who the user is
* what devices belong to them
* what they are connected to
* who they are sharing connectivity with
* what is happening now
* whether something needs attention
* what the user can do next
* how trust and access are being managed

The product should feel:

* modern
* minimal
* distinctive
* fast
* calm
* trustworthy
* technically capable without being complicated
* privacy-conscious
* approachable to first-time users
* powerful for advanced users

Zoop should not feel like a traditional VPN utility with additional features added around it.

The central product concept is **connectivity and relationships**, rather than simply turning a network tunnel on or off.

---

# 5. Core User Outcomes

The experience should enable users to answer, with minimal effort:

> **What is happening?**

> **Who or what am I connected to?**

> **What can I do next?**

Users should be able to:

* establish and manage their Zoop identity
* understand their current connectivity state
* connect through authorized connectivity relationships
* understand provider and recipient relationships
* share connectivity when acting as a Provider
* manage devices associated with their identity
* manage access and permissions
* understand important activity
* troubleshoot connectivity problems
* manage security and recovery
* understand privacy and data usage
* participate in organizations where applicable
* access advanced technical information when necessary

The product should not require users to understand Zoop's internal architecture before they can successfully use it.

---

# 6. Core Product Model

Zoop's mobile experience should be designed around a set of related concepts.

## Identity

A Zoop identity represents the user's presence within the Zoop ecosystem.

The identity system should support:

* creation
* authentication
* identification
* protection
* PIN management
* recovery
* device association
* security management

The Zoop ID is permanent.

A username may be changeable according to platform rules.

The system should avoid collecting unnecessary personal information.

Zoop intentionally does not depend on email or phone numbers as the primary identity model.

---

## Devices

Devices are first-class objects within Zoop.

A device may:

* belong to a Zoop identity
* participate in connectivity
* provide connectivity
* receive connectivity
* have its own credentials
* have security state
* have activity history
* be revoked or removed

Each device should have its own device credential.

A user's identity credential must not simply be copied between devices.

The mobile experience should make device ownership, registration, status, and security understandable.

---

## Connectivity

Connectivity is the central product capability.

The product should allow users to establish and manage authorized connectivity relationships while abstracting unnecessary networking complexity.

Relevant connectivity concepts may include:

* connection state
* provider
* recipient
* direct connectivity
* relayed connectivity
* connection duration
* quality
* latency
* packet loss
* recovery
* connection events

The interface should present complexity progressively.

---

## Providers

Providers are users or devices that make connectivity available.

Providers should feel like intentional participants in the Zoop network rather than anonymous VPN servers.

Users should have enough information to understand:

* who or what the Provider is
* whether the Provider is available
* whether the connection is healthy
* what trust information is relevant
* whether sharing is active
* what action is available

The experience should help users make informed decisions without requiring networking knowledge.

---

## Recipients

Recipients are users or devices using shared connectivity.

The product should support management of:

* recipient identity
* recipient device
* connection status
* usage
* access permissions
* history
* revocation

The interface should frame this as a relationship rather than as an anonymous VPN session.

---

## Sharing

Users may act as Providers and make their connectivity available to others.

The sharing experience should communicate:

* whether sharing is active
* who currently has access
* relevant activity
* usage
* requests
* permissions
* limits
* availability

The language should describe the concept as **sharing connectivity**, rather than presenting it as a generic VPN toggle.

---

## Organizations

A Zoop identity may participate in organizations.

The product should support organization-related concepts including:

* organization membership
* roles
* invitations
* organization devices
* organization connections
* organizational policies
* usage

Advanced organizational administration may remain outside the mobile application where appropriate.

The mobile experience should still provide enough context for users to understand their role and relevant organization state.

---

# 7. First-Time Experience

The first-time experience should introduce Zoop without overwhelming the user.

It should communicate:

* what Zoop is
* why it exists
* the role of privacy and trust
* how identity works
* what the user can accomplish

The onboarding experience must support both:

* creation of a new Zoop identity
* authentication of an existing identity

The implementation should determine the most effective flow for doing this.

The experience should establish the Zoop brand and product model from the beginning rather than resembling a generic account-registration flow.

---

# 8. Identity and Authentication

Zoop identity creation should support the information and security requirements necessary to establish a user's identity.

Relevant concepts include:

* username
* username availability
* Zoop ID generation
* PIN creation
* PIN confirmation
* privacy information

The resulting identity includes:

* a permanent Zoop ID
* a username

Authentication for an existing identity should support:

* Zoop ID
* Zoop PIN
* recovery where applicable

Avoid unnecessary personal-information requirements.

---

# 9. PIN and Sensitive Actions

The Zoop PIN is a security mechanism rather than a general application-opening requirement.

It may be used for:

* authentication
* sensitive actions
* device registration
* security changes
* future financial authorization

The experience should minimize friction while maintaining appropriate security.

The PIN should not be unnecessarily requested every time the application is opened.

The implementation should use the platform's available secure mechanisms where appropriate.

---

# 10. Device Registration and Management

The product must support associating Android and iOS devices with a Zoop identity.

Relevant device information may include:

* device name
* device type
* Zoop identity
* registration status
* security state
* capabilities
* registration date
* last activity or last-seen information

Adding another device may use mechanisms such as:

* QR pairing
* Zoop ID authentication
* device invitations
* other appropriate secure mechanisms

The exact interaction should be determined by the implementation.

Device management must allow users to understand and control devices associated with their identity.

The product must support appropriate device revocation and removal.

---

# 11. Primary Experience

The primary mobile experience should provide an immediate understanding of the user's current context.

Depending on the user's state, it may need to communicate:

* current Zoop state
* connectivity state
* relevant connectivity relationship
* user role
* device state
* sharing state
* meaningful recent activity
* recommended or available actions

The primary experience should adapt to context.

For example, an actively connected user should not necessarily receive the same presentation as a user who is disconnected, troubleshooting, sharing connectivity, or setting up the product for the first time.

The implementation should determine the most effective information hierarchy for each state.

---

# 12. Connectivity States

Connectivity is stateful and the UI must represent meaningful state changes.

The product should support, at minimum:

* not connected
* connecting
* connected
* reconnecting
* connection failure
* sharing state where applicable

The experience should explain failures in human language.

Users should understand what happened and what action, if any, is available.

During connection establishment and recovery, motion may be used to communicate progress and state changes, provided it remains purposeful and accessible.

---

# 13. Connection Information

For an active or recent connection, the product should be capable of communicating relevant information such as:

* participants
* devices
* provider relationship
* recipient relationship
* connection state
* direct versus relay path
* duration
* latency
* packet loss
* usage
* recent events

The product should not expose all technical information at once.

Ordinary users should encounter a simple explanation first.

Advanced users should be able to inspect additional technical detail when necessary.

---

# 14. Connection Quality and Diagnostics

Zoop contains complex networking systems beneath the user experience.

The product should provide a way to understand connectivity health and troubleshoot problems.

Relevant diagnostic information can include:

* network availability
* endpoint reachability
* direct connectivity
* relay state
* latency
* packet loss
* connection attempts
* recovery events
* tunnel state

Diagnostics should remain secondary to the primary experience.

Users should enter advanced diagnostics when they want to investigate a problem or understand deeper networking behavior.

Diagnostics should never replace understandable explanations.

---

# 15. Sharing and Access Management

The product must allow Providers to control how connectivity is shared.

Relevant controls and concepts include:

* who can connect
* which devices are allowed
* access permissions
* usage restrictions
* sharing limits
* provider availability
* current recipients
* requests for access

The implementation should make these controls understandable to non-technical users.

Avoid unnecessary exposure of raw networking terminology, firewall concepts, or implementation details in normal workflows.

Advanced controls may exist for users who need them.

---

# 16. Sharing Requests

When another user requests access to shared connectivity, the request experience should provide enough context for an informed decision.

Relevant information may include:

* requester identity
* requesting device
* request status
* requested access
* relevant trust information

The user should be able to make appropriate decisions such as:

* approve
* reject
* block

The exact interaction mechanism is an implementation decision.

---

# 17. Activity

The product should expose meaningful activity without becoming a raw developer log.

Potential events include:

* device registration
* connection establishment
* disconnection
* direct connection establishment
* relay activation
* connection recovery
* sharing started
* recipient connected
* device revoked
* security events
* organization events

The activity experience should prioritize events that help users understand what is happening or identify something that needs attention.

Detailed event information may include:

* event type
* time
* device
* connection
* participants
* result
* relevant technical information

---

# 18. Security

Security is a core product capability.

The experience should give users meaningful control over:

* Zoop identity
* PIN
* registered devices
* active sessions
* security events
* device revocation
* recovery

Device-level security may include:

* credential state
* registration status
* last authentication
* security events
* revocation

The implementation should balance transparency with simplicity.

Security information should be understandable without unnecessarily exposing internal security implementation details.

---

# 19. Account Recovery

Zoop recovery is a specialized part of the product because the platform does not intentionally rely on email or phone numbers as conventional recovery mechanisms.

The recovery experience must clearly communicate:

* the available recovery method
* information required from the user
* consequences of the recovery process
* how identity protection is maintained

Recovery must never expose another user's identity, credentials, or private information.

Recovery workflows should prioritize preventing irreversible user mistakes.

---

# 20. Privacy

Zoop should make privacy understandable rather than presenting privacy as a legal document hidden from users.

The product should be capable of explaining relevant areas such as:

* account information
* device information
* network metadata
* usage information
* analytics
* data management
* privacy controls

The language should be simple, direct, and transparent.

Users should understand what information Zoop handles and why.

---

# 21. Organizations

When an identity participates in an organization, the mobile experience should communicate the user's organizational context.

Relevant information may include:

* organizations
* membership
* role
* invitations
* organization devices
* organization connections
* policies
* usage

Advanced administrative functionality may remain Web-only when mobile exposure would create unnecessary complexity.

---

# 22. Notifications

Notifications should prioritize events that require attention or provide meaningful information.

Potential categories include:

* connection events
* sharing requests
* device events
* security events
* organization events

Notifications should avoid becoming a continuous stream of low-value technical events.

The product should distinguish between:

* information
* actionable events
* urgent security events

The implementation should follow platform notification conventions.

---

# 23. Settings

The mobile product should provide appropriate controls for application and account configuration.

Relevant domains include:

* account
* identity
* security
* devices
* notifications
* network behavior
* privacy
* appearance
* support
* about

The exact information architecture should be determined by the implementation based on discoverability, hierarchy, frequency of use, and platform conventions.

---

# 24. About and Support

The product should provide appropriate product and system information, including where relevant:

* Zoop version
* Agent version
* platform
* legal information
* applicable open-source information
* support
* diagnostics

Technical information should be accessible when useful without dominating the everyday experience.

---

# 25. Future Payments

Payment functionality is not required for the initial networking implementation.

However, the product architecture should not prevent future financial capabilities.

Potential future concepts include:

* Zoop balance
* pending balance
* transactions
* connectivity purchases
* provider earnings
* pending earnings
* available earnings
* withdrawals
* fees
* adding funds
* payment methods

Payment functionality must remain conceptually and architecturally separate from Zoop identity.

The mobile experience for future financial features should follow the same product principles as the rest of Zoop while being designed as a distinct capability.

---

# 26. Visual Direction

Zoop should have a recognizable visual identity that does not depend on constant use of the logo.

The visual language should generally favor:

* deep or dark surfaces where appropriate
* strong typography
* high contrast
* controlled blue, cyan, and green accents
* restrained use of color
* flat or visually disciplined surfaces
* subtle borders
* clear hierarchy
* purposeful motion
* strong readability

These are visual directions, not mandatory component prescriptions.

The implementation agent should determine the appropriate composition and component system.

Avoid visual decisions that make Zoop appear like a generic:

* VPN client
* network monitoring dashboard
* enterprise admin console
* cryptocurrency application
* technical developer tool

---

# 27. Zoop Visual Language

The Zoop concept of nodes, relationships, and connectivity may influence the visual system.

It can inform:

* connection states
* device relationships
* provider and recipient relationships
* network states
* loading
* transitions
* status communication

This concept should be interpreted creatively.

It does not require literal network diagrams or fixed graphical compositions.

The goal is to make the product feel like a coherent Zoop system.

---

# 28. Navigation and Information Architecture

The application must provide intuitive access to the major product capabilities.

Relevant domains include:

* primary connectivity experience
* connections
* sharing
* devices
* identity
* security
* activity
* organizations
* privacy
* settings
* support

The final navigation architecture should be chosen according to mobile usability rather than by mechanically translating this list into navigation tabs.

The product should avoid excessive navigation complexity.

Users should be able to discover secondary functionality contextually.

The navigation model should work well on both Android and iOS.

---

# 29. Responsive Mobile Design

The design system must support:

* small Android phones
* large Android phones
* iPhones
* different aspect ratios
* different text-size configurations
* accessibility settings
* platform-specific interaction conventions
* supported light and dark appearance modes

The product must not depend on a single phone size, exact viewport dimensions, or fixed positioning.

Layouts should adapt to content, user settings, and device characteristics.

---

# 30. Accessibility

Accessibility is a product requirement, not a later enhancement.

The experience must support:

* accessible text sizing
* screen readers
* sufficient contrast
* accessible touch targets
* reduced motion
* meaningful labels
* clear focus states
* understandable interaction feedback
* status communication that does not depend only on color

Important connection states must never be communicated solely through color.

The implementation should follow current Android and iOS accessibility conventions.

---

# 31. Motion

Motion should communicate meaningful system behavior.

Appropriate uses may include:

* connection establishment
* connection recovery
* device registration
* state transitions
* network activity

Motion should be:

* subtle
* purposeful
* understandable
* responsive

Avoid:

* constant animation
* decorative movement without meaning
* distracting effects
* motion that obscures system state

Zoop should feel alive without feeling like a game.

Reduced-motion preferences must be respected.

---

# 32. Information Hierarchy

Zoop operates across several levels of complexity.

The experience should progressively disclose information.

### Everyday user

The user should primarily see:

* understandable state
* relevant relationships
* useful actions
* meaningful explanations

### Advanced user

The user may need access to:

* direct versus relay path
* latency
* packet loss
* endpoint state
* connection attempts
* recovery events
* tunnel state
* additional technical information

Advanced information should be available without forcing all users to understand it.

---

# 33. Error Handling

Every important product capability should have appropriate behavior for:

* loading
* empty state
* offline state
* authentication failure
* permission failure
* network failure
* service failure
* connection failure
* recovery
* success

Error experiences should answer:

> What happened?

> Why does it matter?

> What can the user do next?

Where recovery is possible, the product should provide an understandable recovery path.

Errors should not expose unnecessary internal implementation details.

---

# 34. Empty States

An empty state should explain the meaning of the current area rather than simply stating that nothing exists.

Where appropriate, an empty state should help the user understand:

* what the area is for
* why it is empty
* what could appear there
* what useful next action is available

Examples of useful outcomes include:

* adding a device
* establishing a connection
* sharing connectivity
* joining or creating an organization

The specific presentation should be determined by the context.

---

# 35. Performance and Responsiveness

The mobile experience should feel fast and deliberate.

The implementation should prioritize:

* quick feedback
* responsive interactions
* efficient loading
* stable state transitions
* predictable behavior
* graceful offline handling
* minimal unnecessary work

Users should receive immediate feedback when an action has begun, even when the underlying networking operation takes longer.

Long-running operations should communicate progress or current state appropriately.

---

# 36. Trust and Transparency

Zoop manages connectivity and access relationships that can have security and privacy implications.

The interface should therefore make important relationships understandable.

Users should be able to determine, where relevant:

* who they are connected to
* what device is involved
* whether connectivity is direct or relayed
* who has access to their shared connectivity
* what permissions exist
* whether a security action succeeded
* what happened after an important event

The product should favor understandable transparency over opaque automation.

---

# 37. Design System

The implementation should establish a coherent Zoop mobile design system before creating a large number of independent product experiences.

The system should cover, as appropriate:

* color tokens
* typography
* spacing
* icons
* buttons
* inputs
* navigation
* device representations
* connection representations
* Provider representations
* Recipient representations
* status indicators
* dialogs
* PIN entry
* loading states
* empty states
* errors
* success feedback
* motion
* accessibility

Product experiences should share common principles and components rather than becoming visually inconsistent.

The design system should evolve as the product is implemented.

It should not become a constraint that prevents appropriate contextual design decisions.

---

# 38. Technical Architecture

The mobile UI is implemented using **Flutter**.

Flutter owns the product interface and interaction model.

Platform-specific networking and operating-system functionality remains implemented using the appropriate Android and iOS technologies.

The mobile experience may integrate with:

* Android networking APIs
* Android VPN/network interfaces
* iOS Network Extension APIs
* secure platform storage
* background execution mechanisms
* platform-specific Agent components

The Flutter application communicates with the Zoop Control Plane through the defined Zoop API.

The architecture should preserve a clear boundary between:

* product interface
* platform-specific networking functionality
* authentication and identity
* secure device credentials
* backend/control-plane communication

---

# 39. Product Security Requirements

Security-related information should be handled according to least-privilege and secure-storage principles appropriate to the platform architecture.

Important requirements include:

* device credentials remain device-specific
* identity credentials are not casually copied between devices
* sensitive actions require appropriate authentication
* device revocation must be supported
* recovery must protect identity integrity
* privacy-sensitive information must not be exposed unnecessarily

The interface should never imply security guarantees that the underlying system does not actually provide.

The implementation should accurately communicate system state.

---

# 40. Platform Experience

The product should feel appropriate on both Android and iOS.

The overall Zoop identity should remain consistent, while the implementation should respect platform conventions where doing so improves usability.

Avoid forcing identical interaction behavior across platforms when native conventions would make the experience better.

Visual consistency should come from the Zoop design language and system rather than from making Android and iOS mechanically identical.

---

# 41. Product Language

Language should be:

* simple
* direct
* calm
* trustworthy
* human
* technically accurate

Prefer user-centered explanations over implementation terminology.

For example, the experience should explain a connectivity problem in terms a normal user can understand before exposing lower-level diagnostic concepts.

Avoid unnecessary terms such as:

* tunnel state
* endpoint reachability
* packet loss
* relay state

in primary user flows unless they are genuinely useful in context.

Technical terminology is appropriate in advanced diagnostic experiences.

---

# 42. AI Agent Implementation Principles

An implementation agent working from this specification should behave as a product designer and engineer, not as a document renderer.

The agent should:

* infer appropriate information architecture
* evaluate multiple possible interaction models
* prioritize mobile usability
* respect Android and iOS conventions
* use progressive disclosure
* avoid unnecessary UI complexity
* create reusable components
* account for accessibility
* account for edge cases
* design complete states
* preserve Zoop's visual identity
* make thoughtful decisions where the specification is intentionally open

The agent should not:

* blindly turn every requirement into a screen
* blindly turn every list into a card layout
* assume every capability requires a navigation tab
* copy literal diagrams into the UI
* add decorative UI without product purpose
* expose technical information simply because it exists
* invent functionality that conflicts with the product model
* sacrifice usability in order to mirror the structure of this specification

When several designs satisfy the requirements, choose the solution that provides the strongest overall user experience.

---

# 43. Quality Bar

The final experience should be evaluated against the following qualities.

## Clarity

A first-time user should understand what is happening without studying the architecture.

## Efficiency

Common tasks should require minimal unnecessary effort.

## Trust

Connectivity, access, identity, and security states should be understandable and honest.

## Distinctiveness

The product should feel recognizably Zoop rather than like a repackaged VPN.

## Flexibility

The system should support both straightforward everyday usage and advanced investigation.

## Accessibility

The experience should remain usable across accessibility configurations and different user abilities.

## Consistency

The product should feel like one coherent system rather than a collection of independently designed screens.

## Resilience

The product should behave well when connectivity is poor, services fail, devices are unavailable, or actions do not succeed.

## Scalability

The architecture and design language should accommodate future product capabilities without requiring the entire mobile experience to be redesigned.

---

# 44. Design Decision Principle

When a requirement can be satisfied in several ways, choose the solution that best balances:

1. user comprehension
2. task efficiency
3. discoverability
4. accessibility
5. platform conventions
6. visual identity
7. technical feasibility
8. consistency
9. future extensibility

Do not optimize for adherence to an imagined screen structure.

Optimize for the user's ability to understand and use Zoop.

---

# 45. Core Product Principle

The Zoop mobile application should make the following questions easy to answer:

> **What is happening?**

> **Who or what am I connected to?**

> **What can I do next?**

Everything else should remain secondary unless the user deliberately chooses to explore more detail.

---

# 46. Final Experience

The final Zoop mobile application should be:

**Simple enough for anyone to use.**

**Powerful enough for advanced users.**

**Distinct enough to feel like Zoop.**

**Transparent enough that users understand what is happening.**

**Private enough that users do not feel forced to surrender unnecessary personal information.**

**Flexible enough to support future capabilities.**

Zoop is not merely a mobile VPN control panel.

It is the mobile interface to a connectivity ecosystem built around identity, devices, relationships, trust, sharing, and networks.

The implementation should preserve that product philosophy while using its own judgment to determine the best possible mobile experience.
