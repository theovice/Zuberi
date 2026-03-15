# **Network Security Architecture for Split-Node Autonomous AI Systems**

## **Executive Summary and Architectural Threat Model**

The deployment of autonomous artificial intelligence agents within segmented infrastructure presents profound and multifaceted challenges in network security, particularly when attempting to balance the imperative for agent operational capability against the strict requirements of network isolation. The architecture under analysis involves a split-node infrastructure comprising a primary orchestration node, designated as KILO, and an execution and utility node, designated as CEG. The KILO node operates within a Windows 11 environment, hosting the OpenClaw AI gateway, an Ollama inference server, and a Tauri desktop frontend. Crucially, the AI agent resides within a Docker container on the KILO node, restricted by a network: none configuration. This configuration is designed to physically isolate the containerized agent from the external internet, permitting communication solely over a Tailscale virtual private network and localhost interfaces.1

The CEG node, operating on an Ubuntu Server 24 environment with constrained hardware resources specifically a Lenovo M710q small form factor system functions as the agent's operational toolkit. It hosts a suite of nine critical internal services, including a vector database (Chroma), context store (CXDB), email relay (AgenticMail), search engine (SearXNG), and task management systems (n8n workflow automation). The security equilibrium of this split-node architecture is fundamentally altered by the introduction of a shell execution service on the CEG node. This bespoke service, operating over HTTP port 3003, accepts POST requests containing arbitrary shell commands and executes them within the CEG environment as a non-root user.

The introduction of this shell execution capability effectively neutralizes the primary containment strategy implemented on the KILO node. Because the CEG node possesses unrestricted outbound internet access by default, the AI agent can utilize the shell service to route internet-accessing commands such as curl, wget, git clone, and various package managers like pip and npm through the CEG infrastructure. This establishes a highly viable vector for potential data exfiltration, the downloading of malicious payloads, or the initiation of lateral movement attacks across the broader network infrastructure.

The threat model assumes the AI agent acts as a highly capable but vulnerable entity. While not inherently malicious, autonomous AI agents are highly susceptible to prompt injection, supply chain poisoning, and logic manipulation.2 If an external malicious actor successfully injects an instruction into the agent's context window, the agent could be manipulated into utilizing its shell access to download and execute a reverse shell, exfiltrate sensitive workspace context to an external server, or compromise internal databases. Furthermore, even without malicious manipulation, the agent might inadvertently install compromised libraries from public package registries, introducing vulnerabilities into the local environment. Consequently, treating the agent's execution environment as a Zero Trust boundary is mandatory.

To mitigate these risks without crippling the agent's operational utility, the CEG node requires a comprehensive egress filtration architecture. This architecture must lock down all outbound access by default, permitting only approved, whitelisted domains to be reached. Simultaneously, it must preserve the functional integrity of necessary external services, such as the SearXNG search proxy, the n8n financial data workflow, and the AgenticMail SMTP relay. The solution must be maintainable by a single operator without extensive network engineering expertise, avoiding the fragility of highly complex routing configurations. Furthermore, the architecture must integrate cognitive awareness into the AI agent, enabling it to recognize network boundaries, interpret access denials, and autonomously request human-approved whitelist modifications when novel external resources are legitimately required to fulfill a task.1

## **Evaluation of Egress Filtering Paradigms**

The implementation of outbound network restrictions on a Linux server presents several architectural pathways, each possessing distinct operational characteristics, scaling limitations, and administrative complexities. The primary challenge lies in the nature of modern web traffic: the domains required by the agent, such as GitHub repositories and package registries, are hosted on globally distributed Content Delivery Networks (CDNs).4 These CDNs utilize highly dynamic, load-balanced IP addresses that cycle rapidly, rendering static IP-based firewalls fundamentally ineffective for domain-based filtering.

## **Layer 3 and Layer 4 Filtration Constraints**

Traditional packet filtering utilities, including Uncomplicated Firewall (UFW), iptables, and the modern nftables, operate predominantly at OSI Layers 3 (Network) and 4 (Transport). UFW is widely recognized for its syntactic simplicity and user-friendly management interface, abstracting the complex rule structures required by underlying kernel modules.6 While highly effective for securing inbound ports or defining static outbound routing rules, UFW fundamentally relies on IP addresses rather than Fully Qualified Domain Names (FQDNs).

Attempting to whitelist a service like GitHub or Python Package Index (PyPI) using UFW requires the manual entry of massive, frequently shifting Classless Inter-Domain Routing (CIDR) blocks.4 GitHub, for instance, publishes an API endpoint to track its IP ranges, but these ranges encompass thousands of addresses and change periodically based on global routing optimizations.5 Maintaining an updated list of CDN IP addresses within UFW via automated scripts introduces significant fragility; a synchronization failure will result in instantaneous service outages for the AI agent, leading to cascaded task failures.

Advanced configurations using nftables offer a potential workaround by integrating with dynamic DNS resolvers. Specifically, the dnsmasq service can be configured to resolve specified FQDNs and automatically inject the resulting IP addresses into dynamic nftables structures known as nftsets.10 When an internal service queries dnsmasq for a whitelisted domain, the resolved IP is added to an allowed set within the firewall, permitting the subsequent TCP connection.10 However, this approach introduces substantial complexity for a single-operator environment.11 It is also highly susceptible to Time-To-Live (TTL) synchronization issues, where the local DNS cache and the CDN's actual routing diverge due to geographic load balancing, resulting in dropped packets and unpredictable connectivity.13 Furthermore, dnsmasq support for modern netfilter subsystems has faced deprecation challenges in certain package distributions, making it a brittle dependency for a long-term deployment.14

## **Proxy-Based Server Name Indication (SNI) Inspection**

An alternative paradigm shifts the enforcement mechanism from the network layer to the application layer using a forward proxy server, such as Squid. Rather than managing complex firewall rules on the CEG node, the node can be configured to block all direct outbound internet access at the kernel level. Traffic requiring external access is instead routed through an HTTP/HTTPS proxy hosted on the secure KILO node.

Historically, filtering HTTPS traffic via a proxy required a Man-In-The-Middle (MITM) architecture. This necessitated the deployment of custom Certificate Authorities (CAs) on the client machine to intercept, decrypt, inspect, and re-encrypt the traffic before forwarding it to the destination.15 This approach is notoriously difficult to maintain, introduces severe cryptographic liabilities if the CA is compromised, and frequently breaks package managers, development tools, and APIs that utilize strict certificate pinning to prevent interception.16

However, modern proxy implementations support a mechanism known as "Peek and Splice," utilizing the Server Name Indication (SNI) extension of the Transport Layer Security (TLS) protocol.17 During the initial TLS handshake, before any encrypted payload is transmitted, the client transmits the requested destination hostname in plaintext within the ClientHello message. A Squid proxy configured with the ssl\_bump peek directive can intercept this initial packet, extract the SNI domain string, and evaluate it against a configured Access Control List (ACL).17

If the domain is successfully matched against the whitelist, the proxy executes a splice action.17 Splicing instructs the proxy to act as a blind TCP tunnel; it steps out of the cryptographic exchange, allowing the encrypted stream to flow directly between the client and the destination server without terminating the encryption.17 If the domain is unapproved, the proxy utilizes the terminate action to immediately sever the connection.17 This mechanism provides robust domain-based filtering without the overhead, fragility, and breakage associated with MITM decryption, making it highly suitable for an AI agent's development toolkit.

## **Systemd Control Groups and Network Namespaces**

A granular, surgical approach to isolation utilizes the inherent capabilities of the Linux kernel's namespaces and control groups (cgroups), orchestrated natively via systemd. Ubuntu Server 24 supports advanced resource control directives within systemd unit files, specifically IPAddressAllow and IPAddressDeny.22 These directives leverage Extended Berkeley Packet Filter (eBPF) technology to restrict both incoming and outgoing network traffic at the individual process level, rather than globally across the entire operating system.22

By defining IPAddressAllow=100.64.0.0/10 (the standard Tailscale Carrier-Grade NAT subnet) and IPAddressAllow=127.0.0.0/8 (localhost) within a specific service's unit file, the kernel strictly prohibits that specific process from communicating with any other network, regardless of the global firewall state.22 Furthermore, systemd allows services to be executed within entirely private network namespaces using the PrivateNetwork=yes directive.25 This creates a virtual network stack completely isolated from the host's primary physical interfaces.26

While running complex applications in isolated network namespaces provides the highest theoretical level of security, it can significantly complicate service discovery, database connections, and inter-process communication.28 The eBPF-based IPAddressAllow approach offers a more pragmatic middle ground, allowing the service to reside in the host network namespace while strictly policing the IP prefixes it is permitted to contact.22

## **The Recommended Architecture: Hybrid Zero-Trust Sandbox**

The optimal architecture for securing the CEG node against autonomous agent overreach requires a hybrid defense-in-depth approach. Relying solely on a monolithic local firewall is too rigid for the dynamic nature of CDN-backed services, while relying solely on application-level proxies leaves the host kernel vulnerable if an application successfully bypasses the proxy configuration variables. Therefore, the recommended architecture combines strict Layer 3 and 4 physical isolation on CEG with a Layer 7 SNI-inspecting proxy hosted on KILO.

## **Architectural Blueprint**

1. **Physical Interface Lockdown (CEG)**: The primary physical network interface on the CEG node (e.g., eth0 or wlan0) is restricted via UFW to a default-deny state for all outbound traffic. The only permitted outbound communication across the physical boundary is User Datagram Protocol (UDP) traffic directed to the Tailscale overlay network, ensuring the node maintains its connection to the VPN fabric without exposing the host to the wider internet.30  
2. **Tailscale Control Plane**: The Tailscale interface (tailscale0) becomes the exclusive conduit for all inter-node communication and authorized external data transfer. Traffic originating from CEG and destined for KILO (100.x.x.x) is implicitly trusted and unrestricted across the VPN.  
3. **Forward Proxy Gateway (KILO)**: The Windows 11 KILO node hosts a Squid proxy server, bound exclusively to KILO's Tailscale IP address. This proxy is configured with the ssl\_bump peek and splice directives to enforce strict FQDN-based whitelisting without decrypting the payload.17  
4. **Agent Environment Configuration**: The shell execution service on CEG, and the AI agent itself, are configured with the standard http\_proxy and https\_proxy environment variables, pointing to the KILO proxy over Tailscale.31 When the agent executes a command requiring external data (e.g., curl https://api.github.com), the tool natively routes the request through the Tailscale tunnel to the KILO proxy.  
5. **Local Package Caching**: To minimize the required attack surface for code execution, direct access to PyPI and npm registries is entirely superseded by local caching proxies (Devpi for Python and Verdaccio for Node.js) hosted on the KILO node.32 The AI agent pulls dependencies exclusively from these internal, Tailscale-bound caches rather than the open internet.  
6. **Granular Service Isolation**: Internal-only services on CEG (Vector Database, Context Store, Task Board) are further constrained using systemd IPAddressAllow directives, restricting their network access strictly to localhost and the Tailscale subnet, preventing any possibility of data exfiltration even if the global UFW state is temporarily degraded.22

## **Architectural Justification**

This hybrid architecture elegantly resolves the core contradictions of the deployment. By moving the domain filtering logic to the KILO node via Squid, the system handles the dynamic IP churn of GitHub and package CDNs using SNI inspection, effectively mitigating the primary limitation of UFW.4 The CEG node, which is inherently untrusted due to the arbitrary shell execution service, is physically isolated from the internet at the kernel level via UFW.

Should the AI agent be manipulated into downloading a malicious binary, or should a zero-day exploit compromise the shell service, the attacker cannot bypass the proxy variables to establish a direct outbound Command and Control (C2) connection, because the underlying physical interface will silently drop the packets. Furthermore, this setup aligns perfectly with the operational constraints. The human operator is not required to be a network engineer; adding a new permitted domain is as simple as appending a plaintext string to a single ACL file on the KILO node.35 The reliance on Tailscale for the proxy transport ensures that all traffic between the execution environment and the proxy is end-to-end encrypted and cryptographically authenticated, shielding the proxy from unauthorized local network access.36

| Architectural Layer | Enforcement Mechanism | Primary Function | Vulnerability Mitigated |
| :---- | :---- | :---- | :---- |
| **Physical Interface** | UFW (Default Deny Outbound) | Blocks all direct internet egress from CEG hardware. | Direct C2 callbacks, proxy variable bypass. |
| **Process Control** | Systemd IPAddressAllow | Restricts internal services to loopback and Tailscale subnets via eBPF. | Internal service compromise, lateral movement. |
| **Transport Protocol** | Tailscale VPN | Encrypts and authenticates inter-node traffic. | Local network interception, unauthorized proxy usage. |
| **Application Proxy** | Squid SNI (Peek and Splice) | Validates requested domains against a strict whitelist. | Data exfiltration to unauthorized domains, CDN IP churn. |
| **Package Management** | Devpi & Verdaccio Caches | Serves vetted software dependencies locally. | Supply chain poisoning, arbitrary code download. |

## **Step-by-Step Configuration and Implementation**

The implementation of this architecture must be executed in a specific sequence to prevent the human operator from severing their own administrative access to the CEG node. The following sections detail the precise command-line configurations required for the Ubuntu Server 24 environment and the Windows 11 proxy host.

## **UFW Kernel-Level Enforcement on CEG**

The configuration of UFW establishes the baseline physical isolation. Given the constrained resources of the Lenovo M710q, UFW provides an optimal balance of low processing overhead and ease of administration.6 The administrative interface requires the definition of a strict default policy. By default, UFW permits outgoing connections.37 This paradigm must be inverted.

1. **Establish Baseline Policies**: The default behavior is modified to block all egress traffic.  
   Bash  
   sudo ufw default deny incoming  
   sudo ufw default deny outgoing

2. **Permit Administrative Access**: SSH access must be preserved, but restricted exclusively to the Tailscale subnet to prevent local network lateral movement.  
   Bash  
   sudo ufw allow in on tailscale0 to any port 22

3. **Permit Tailscale Transport**: The Tailscale daemon requires outbound access to establish its WireGuard tunnels and communicate with coordination servers. By default, Tailscale utilizes UDP port 41641 for peer-to-peer connections.30 Additionally, the Tailscale interface itself must be whitelisted for bidirectional traffic.  
   Bash  
   sudo ufw allow out 41641/udp  
   sudo ufw allow in on tailscale0  
   sudo ufw allow out on tailscale0

4. **Activate Enforcement**: The firewall is reloaded to apply the restrictive ruleset. It is imperative to verify the rules via sudo ufw status verbose prior to enabling.  
   Bash  
   sudo ufw enable

Following the execution of these rules, the CEG node is mathematically incapable of establishing a direct TCP connection to any external internet address over its physical ethernet or Wi-Fi interfaces. All subsequent connectivity must utilize the tailscale0 virtual interface.

## **Systemd Process Isolation via eBPF on CEG**

To ensure defense-in-depth, the specific internal services running on CEG, particularly the vulnerable shell execution service on port 3003, must be constrained so that even if the UFW firewall is somehow bypassed, the kernel will restrict the individual processes. Ubuntu Server 24 incorporates systemd versions capable of leveraging eBPF for process-level network control.22 This is implemented by creating a drop-in modification for the service's unit file.

Assuming the shell service is managed by a unit named aishell.service, execute the following command to create a drop-in override:

Bash

sudo systemctl edit aishell.service

Within the editor, inject the following directives into the \`\` block:

Ini, TOML

IPAddressAllow\=127.0.0.0/8  
IPAddressAllow\=100.64.0.0/10  
IPAddressAllow\=::1/128  
IPAddressDeny\=any

The IPAddressAllow directive explicitly whitelists the IPv4 loopback, the Tailscale Carrier-Grade NAT (CGNAT) subnet, and the IPv6 loopback.22 The IPAddressDeny=any directive establishes a hard eBPF block against any destination IP that falls outside these ranges.22 This control group restriction cannot be bypassed by the process itself, even if it attempts to spawn child processes or manipulate its own routing tables.22

#### **Mitigating Tailscale Daemon Startup Sequencing**

A known race condition occurs when systemd services are configured to bind exclusively to a Tailscale IP address or rely on the Tailscale network for startup validation. The dependent service may attempt to start before the tailscaled daemon has successfully established the interface and secured an IP address from the coordination server, resulting in a fatal bind: cannot assign requested address error.24

To rectify this, all custom services on the CEG node that interact with the Tailscale interface must be modified to sequence their startup logic accurately. Within the same systemctl edit interface, the \[Unit\] block must be updated:

Ini, TOML

\[Unit\]  
Wants\=tailscaled.service  
After\=tailscaled.service

This guarantees that the AI agent's toolset remains offline until the secure communication fabric is fully operational.38

## **Squid SNI Proxy Configuration on KILO**

The KILO node serves as the cognitive and network gateway. Hosting a Squid proxy server on this Windows 11 machine can be accomplished via Docker Desktop or the Windows Subsystem for Linux (WSL). The proxy establishes a centralized, highly visible chokepoint for all external data requests originating from the CEG execution environment.

Traditional proxy filtering relies on the HTTP CONNECT method, which is effective for standard web browsing but breaks down when applied to automated command-line tools, obscure APIs, and non-standard TLS implementations. To inspect traffic without initiating a destructive MITM intervention, Squid must be configured with the ssl-bump feature set.19

The proxy configuration file (/etc/squid/squid.conf) requires precise directives to enable Peek and Splice behavior securely:

Code snippet

\# Bind exclusively to the Tailscale interface  
http\_port 100.x.x.x:3128 ssl-bump generate-host-certificates=off cert=/etc/squid/squid.pem

\# Define the Access Control List mapped to the external text file  
acl allowed\_domains ssl::server\_name "/etc/squid/whitelist.txt"  
acl step1 at\_step SslBump1

\# Execute the Peek and Splice logic  
ssl\_bump peek step1  
ssl\_bump splice allowed\_domains  
ssl\_bump terminate all

\# Mitigate Host Header Forgery dropping for CDN IPs  
ipcache\_size 2048  
fqdncache\_size 2048  
positive\_dns\_ttl 1 hours  
negative\_dns\_ttl 1 minutes

Note: While MITM decryption is not occurring, the ssl-bump directive architecturally requires a valid PEM certificate structure to initialize the TLS parsing engine, hence the cert= parameter.21

The Host Header Forgery mitigation parameters (ipcache\_size, fqdncache\_size) are critical. CDNs often utilize IP addresses that serve thousands of distinct domains. When a client connects to a CDN IP, Squid may detect a mismatch between the requested FQDN and the DNS resolution of the destination IP, triggering host header forgery protections and dropping the connection.19 Allocating sufficient memory to maintain stateful mappings of CDN routing resolves this behavior.19

## **Package Manager Caches (Devpi & Verdaccio)**

The AI agent requires the ability to install software dependencies to execute complex analytical tasks or build operational sub-agents. Granting the agent unmitigated access to the public ecosystems introduces severe supply chain vulnerabilities. An AI agent is highly susceptible to installing malicious packages exhibiting typosquatting or dependency confusion.4

To mitigate this, local package caching proxies Devpi for Python and Verdaccio for npm are deployed as Docker containers on the KILO node.32

When the agent on CEG executes a package installation command, the tools must be configured to prioritize the KILO proxies. On the CEG node, the global pip configuration (/etc/pip.conf) is updated:

Ini, TOML

\[global\]  
index-url \= http://100.x.x.x:3141/root/pypi/+simple/  
trusted-host \= 100.x.x.x

If the requested package is not present in the local cache, the Devpi server on KILO which possesses controlled internet access via its host fetches the package from the public PyPI registry, stores an immutable copy on KILO's local storage, and serves it to the CEG node.33 The CEG node never establishes a direct connection to public package registries, adhering strictly to the zero-trust paradigm.32 Furthermore, the human operator can monitor exactly which packages the AI agent has requested by reviewing the registry logs, ensuring full visibility into the software supply chain.33

## **Application-Specific Network Policies and Domain Directory**

The whitelist file on the KILO proxy (/etc/squid/whitelist.txt) must be meticulously populated to support the remaining external tools. Wildcard subdomains are designated by a leading dot (e.g., .github.com) to encompass all necessary CDN endpoints.17

## **SearXNG Meta-Search Constraints**

SearXNG operates as a proxying meta-search engine, aggregating results from numerous external providers.42 By default, a SearXNG instance will attempt to connect to dozens of disparate search APIs, fundamentally conflicting with a strict domain whitelist architecture.43

To integrate SearXNG safely, its configuration file (settings.yml) must be modified to restrict the active engines to a carefully selected subset. The use\_default\_settings directive can be leveraged to remove superfluous engines.45 Furthermore, SearXNG must be explicitly instructed to route its outbound requests through the KILO Squid proxy. This is achieved by defining the proxies parameter within the outgoing block of the settings.yml file, pointing HTTP and HTTPS traffic to KILO's Tailscale IP and port.46

YAML

outgoing:  
  proxies:  
    http:  
      \- http://100.x.x.x:3128  
    https:  
      \- http://100.x.x.x:3128

engines:  
  \- name: duckduckgo  
    engine: duckduckgo  
    shortcut: ddg

## **AgenticMail SMTP Integration**

The AgenticMail service requires access to Gmail's SMTP relays to transmit outgoing communications.48 SMTP traffic operates on TCP port 587 utilizing the STARTTLS protocol for cryptographic negotiation.49 Unlike standard HTTPS traffic, SMTP traffic cannot be easily routed through an SNI-inspecting Squid proxy without complex tunneling protocols.

Consequently, the optimal architectural solution for AgenticMail is an exception at the systemd control group layer. The AgenticMail service unit file is configured with an IPAddressAllow directive specifically authorizing communication with the ASN and IP ranges utilized by smtp.gmail.com.22 While Google's specific IPs fluctuate, they are strictly defined within known Autonomous System Number boundaries, allowing for a targeted, localized firewall exception that does not rely on the FQDN proxy.

## **Comprehensive FQDN Access Matrix**

The following table dictates the explicit domains required within the Squid whitelist (/etc/squid/whitelist.txt) to maintain core agent functionality without exposing the system to arbitrary exfiltration vectors.

| Service / Tool | Domain String | Justification & Traffic Analysis |
| :---- | :---- | :---- |
| **Shell Tools (Git)** | .github.com | Primary repository cloning and source code access.4 |
| **Shell Tools (Git)** | .githubusercontent.com | GitHub CDN for raw file retrieval and asset downloads.5 |
| **SearXNG (Engine)** | .duckduckgo.com | Approved search endpoint. Routed via SearXNG's internal proxy configuration.47 |
| **SearXNG (Engine)** | .wikipedia.org | Approved knowledge retrieval endpoint. |
| **Workflow (n8n)** | .alphavantage.co | Financial API data retrieval for daily trading workflows.52 |
| **Workflow (n8n)** | query1.finance.yahoo.com | Specific endpoint for Yahoo Finance algorithmic trading data.53 |

Note: The Devpi and Verdaccio caching mechanisms operate internally on the KILO node; therefore, .pypi.org and .npmjs.org do not need to be whitelisted for the CEG node.8 Internal services such as CXDB, Chroma, Kanban, and the Routing Shim require zero external FQDNs and are restricted entirely by systemd IPAddressDeny policies.22

## **Verification and Validation Procedures**

Following the implementation of the security architecture, a rigorous validation phase is required to ensure the controls function as intended without introducing operational degradation.

1. **Physical Isolation Verification**: From the CEG node terminal, attempt a direct ICMP echo request and a direct HTTPS request bypassing the proxy. Both attempts must fail with connection timeouts, proving the UFW default deny policy is active.  
   Bash  
   ping 8.8.8.8  
   curl \-I https://www.google.com

2. **Tailscale Fabric Verification**: Confirm that inter-node communication remains operational, proving the UFW exceptions for the Tailscale interface are correctly formatted.  
   Bash  
   ping 100.x.x.x

3. **Proxy SNI Filtering Verification**: Export the proxy environment variables within the CEG shell and attempt to fetch data from both a whitelisted and a non-whitelisted domain.  
   Bash  
   export http\_proxy=http://100.x.x.x:3128  
   export https\_proxy=http://100.x.x.x:3128

   \# Must succeed (HTTP 200\)  
   curl \-I https://github.com

   \# Must fail (TCP\_DENIED or Proxy Authentication Required)  
   curl \-I https://www.reddit.com

4. **Systemd Process Isolation Verification**: Review the status of the isolated services using systemctl status aishell.service to confirm the eBPF limits have been applied successfully without generating permission errors in the journal logs.

## **Agent Cognitive Awareness and Request Workflow**

For an autonomous AI agent to function effectively within a heavily restricted network environment, the agent must possess deep contextual awareness of its boundaries. Without this awareness, network timeouts and 403 Forbidden errors will induce continuous hallucination cycles, where the agent repeatedly attempts alternative, failing syntax under the false assumption that the tool itself is malfunctioning, rapidly depleting inference resources.

## **Prompt Injection and Environmental Context**

The OpenClaw architecture dynamically constructs a custom system prompt prior to every agent execution cycle.3 This prompt assembles critical environmental data, tooling descriptions, and safety guardrails into the context window.1 To integrate network awareness, the configuration files defining the agent's identity and workspace must inject a highly specific environmental context block.55

The system prompt must explicitly state the operational constraints:

*The operational environment operates within a physically air-gapped sandbox. Direct internet access is disabled at the kernel level. All external requests are forcibly routed through a strict FQDN-based SNI intercepting proxy over a secure VPN. If a command executing external network calls (e.g., curl, wget, git) returns a TCP\_DENIED, SSL certificate error, or HTTP 403 Forbidden, you must deduce that the target domain is not currently whitelisted in the proxy Access Control List. You are strictly prohibited from attempting to bypass the proxy or manipulate network routing tables. Instead of hallucinating alternative commands, you must immediately invoke the request\_firewall\_whitelist skill.*

## **The Request and Override Workflow**

When the agent attempts to interact with a novel API or download a repository from an unauthorized domain, the KILO Squid proxy intercepts the request, blocks the connection via the terminate action, and returns a standard HTTP error payload to the CEG node.17 The agent processes this error output within its reasoning loop. Guided by the explicit instructions in its system prompt, the agent ceases execution of the network task and invokes the specifically designed request\_firewall\_whitelist skill.

This tool acts as a structured internal messaging relay. It accepts heavily typed parameters from the agent, including the requested FQDN, the specific task requiring the resource, and a formal justification analyzing the risk and utility of the domain. The tool transmits this payload to a designated administrative queue on the KILO node, rendering it visible in the Tauri frontend or triggering a local notification.

The human operator evaluates the agent's justification. If the request is deemed benign and necessary, the operator appends the domain string to the /etc/squid/whitelist.txt file and issues the squid \-k reconfigure command to dynamically reload the ACL without dropping active connections.35 Once the proxy is updated, the operator triggers an approval webhook, signaling the agent's task manager that the network topology has been updated and the paused operation can resume. This workflow ensures that the agent remains functionally capable while guaranteeing it cannot autonomously modify the constraints governing its own existence.3

## **Telemetry, Audit Logging, and Agent Observability**

The final pillar of the split-node security architecture is comprehensive observability. If the agent is compromised, begins exhibiting aberrant behavior, or experiences consistent task failures due to undocumented domain dependencies, the system must generate high-fidelity, machine-readable telemetry data.

## **Structuring Log Data for AI Analysis**

Traditional syslog outputs, such as those generated by the Linux kernel for UFW events, are unstructured text blocks. While readable by human system administrators, they are highly inefficient for automated programmatic analysis by language models.56 To facilitate rapid auditing and autonomous debugging, all network telemetry must be converted into structured JSON payloads.57

On the KILO node, a log parsing utility such as NXLog or Filebeat is deployed specifically to monitor the Squid access.log. The parsing utility uses regular expressions to extract critical data points—such as the timestamp, client IP, requested SNI domain, proxy action (e.g., TCP\_TUNNEL, TCP\_DENIED), and byte count—and maps these variables into a strictly typed JSON object using modules like xm\_json.59 Similarly, on the CEG node, the log parser captures UFW blocking events from the kernel ring buffer, formatting the source IP, destination IP, and blocked port into identical JSON structures.61

## **Autonomous Auditing Integration**

These formatted JSON logs are continuously ingested into a centralized, lightweight log aggregation index running on KILO. The JSON formatting is critical, as it aligns natively with the data processing capabilities and structured output expectations of Large Language Models.63

The architecture equips the AI agent with a specific read\_audit\_logs tool, allowing it to query the local log index. During debugging or diagnostic tasks, the agent can retrieve the exact JSON record corresponding to a failed network request.58 This allows the agent to conclusively determine whether a task failure was caused by a malformed HTTP request, a DNS resolution error, or a definitive firewall interdiction.58 This closed-loop observability ensures that the agent operates with total clarity regarding its environmental constraints, while the human operator maintains an immutable, mathematically robust record of every egress attempt executed across the split-node infrastructure, fulfilling all requirements for a secure, capable, and auditable autonomous system.

#### **Works cited**

1. OpenClaw best practices for safe and reliable usage \- Hostinger, accessed March 13, 2026, [https://www.hostinger.com/tutorials/openclaw-best-practices](https://www.hostinger.com/tutorials/openclaw-best-practices)  
2. A Practical Guide to Securely Setting Up OpenClaw. I Replaced 6+ Apps with One “Digital Twin” on WhatsApp. | Medium, accessed March 13, 2026, [https://medium.com/@srechakra/sda-f079871369ae](https://medium.com/@srechakra/sda-f079871369ae)  
3. System Prompt \- OpenClaw Docs, accessed March 13, 2026, [https://docs.openclaw.ai/concepts/system-prompt](https://docs.openclaw.ai/concepts/system-prompt)  
4. Managing allowed IP addresses for your organization \- GitHub Enterprise Cloud Docs, accessed March 13, 2026, [https://docs.github.com/enterprise-cloud@latest/organizations/keeping-your-organization-secure/managing-allowed-ip-addresses-for-your-organization](https://docs.github.com/enterprise-cloud@latest/organizations/keeping-your-organization-secure/managing-allowed-ip-addresses-for-your-organization)  
5. About GitHub's IP addresses, accessed March 13, 2026, [https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses)  
6. Difference Between ufw vs. nftables vs. iptables | Baeldung on Linux, accessed March 13, 2026, [https://www.baeldung.com/linux/ufw-nftables-iptables-comparison](https://www.baeldung.com/linux/ufw-nftables-iptables-comparison)  
7. choosing firewall: ufw vs nftables vs iptables \- Unix & Linux Stack Exchange, accessed March 13, 2026, [https://unix.stackexchange.com/questions/746225/choosing-firewall-ufw-vs-nftables-vs-iptables](https://unix.stackexchange.com/questions/746225/choosing-firewall-ufw-vs-nftables-vs-iptables)  
8. what url should I authorize to use pip behind a firewall? \- Stack Overflow, accessed March 13, 2026, [https://stackoverflow.com/questions/14277088/what-url-should-i-authorize-to-use-pip-behind-a-firewall](https://stackoverflow.com/questions/14277088/what-url-should-i-authorize-to-use-pip-behind-a-firewall)  
9. What GitHub IP addresses to allow on firewall for deployments. \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/github/comments/118u5ay/what\_github\_ip\_addresses\_to\_allow\_on\_firewall\_for/](https://www.reddit.com/r/github/comments/118u5ay/what_github_ip_addresses_to_allow_on_firewall_for/)  
10. Using dnsmasq & nftables together to create DNS block lists \- monotux.tech, accessed March 13, 2026, [https://www.monotux.tech/posts/2024/08/dnsmasq-netfilter/](https://www.monotux.tech/posts/2024/08/dnsmasq-netfilter/)  
11. Advanced ruleset for dynamic environments \- nftables wiki, accessed March 13, 2026, [https://wiki.nftables.org/wiki-nftables/index.php/Advanced\_ruleset\_for\_dynamic\_environments](https://wiki.nftables.org/wiki-nftables/index.php/Advanced_ruleset_for_dynamic_environments)  
12. \[Dnsmasq-discuss\] Using nftables internal "ipset" rule, accessed March 13, 2026, [https://dnsmasq-discuss.thekelleys.org.narkive.com/sUVXWKgt/using-nftables-internal-ipset-rule](https://dnsmasq-discuss.thekelleys.org.narkive.com/sUVXWKgt/using-nftables-internal-ipset-rule)  
13. How should nftables rules using hostnames be rewritten to deal with multiple addresses?, accessed March 13, 2026, [https://serverfault.com/questions/963665/how-should-nftables-rules-using-hostnames-be-rewritten-to-deal-with-multiple-add](https://serverfault.com/questions/963665/how-should-nftables-rules-using-hostnames-be-rewritten-to-deal-with-multiple-add)  
14. Dnsmasq (full) and firewall4 \- using ipset or nftables together \- no out-of-the-box solution in OpenWrt 22.03.03, accessed March 13, 2026, [https://forum.openwrt.org/t/dnsmasq-full-and-firewall4-using-ipset-or-nftables-together-no-out-of-the-box-solution-in-openwrt-22-03-03/156380](https://forum.openwrt.org/t/dnsmasq-full-and-firewall4-using-ipset-or-nftables-together-no-out-of-the-box-solution-in-openwrt-22-03-03/156380)  
15. URL-based filtering possible without certificate management? : r/opnsense \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/opnsense/comments/1hp31a8/urlbased\_filtering\_possible\_without\_certificate/](https://www.reddit.com/r/opnsense/comments/1hp31a8/urlbased_filtering_possible_without_certificate/)  
16. Squid Transparent Proxy For Blacklisting & Whitelisting : r/sysadmin \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/sysadmin/comments/66jz3j/squid\_transparent\_proxy\_for\_blacklisting/](https://www.reddit.com/r/sysadmin/comments/66jz3j/squid_transparent_proxy_for_blacklisting/)  
17. Feature: SslBump Peek and Splice | Squid Web Cache wiki, accessed March 13, 2026, [https://wiki.squid-cache.org/Features/SslPeekAndSplice](https://wiki.squid-cache.org/Features/SslPeekAndSplice)  
18. SSLBUMP without MITM \- Netgate Forum, accessed March 13, 2026, [https://forum.netgate.com/topic/109804/sslbump-without-mitm/22](https://forum.netgate.com/topic/109804/sslbump-without-mitm/22)  
19. Transparent HTTPS proxy with squid using SNI \- Server Fault, accessed March 13, 2026, [https://serverfault.com/questions/1133064/transparent-https-proxy-with-squid-using-sni](https://serverfault.com/questions/1133064/transparent-https-proxy-with-squid-using-sni)  
20. Transparent Proxy with SSL SNI only inspection and whitelist feature \- OPNsense Forum, accessed March 13, 2026, [https://forum.opnsense.org/index.php?topic=35873.0](https://forum.opnsense.org/index.php?topic=35873.0)  
21. SSLBUMP without MITM \- Netgate Forum, accessed March 13, 2026, [https://forum.netgate.com/topic/109804/sslbump-without-mitm](https://forum.netgate.com/topic/109804/sslbump-without-mitm)  
22. systemd.resource-control \- Freedesktop.org, accessed March 13, 2026, [https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html](https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html)  
23. Allow for per-user network namespaces · Issue \#30512 · systemd/systemd \- GitHub, accessed March 13, 2026, [https://github.com/systemd/systemd/issues/30512](https://github.com/systemd/systemd/issues/30512)  
24. "Export localhost" option? · Issue \#1121 \- GitHub, accessed March 13, 2026, [https://github.com/tailscale/tailscale/issues/1121](https://github.com/tailscale/tailscale/issues/1121)  
25. Restricting network access using Linux Network Namespaces | Hacker News, accessed March 13, 2026, [https://news.ycombinator.com/item?id=35860827](https://news.ycombinator.com/item?id=35860827)  
26. Bypassing Ubuntu's user-namespace restrictions \- LWN.net, accessed March 13, 2026, [https://lwn.net/Articles/1015649/](https://lwn.net/Articles/1015649/)  
27. How to Implement Docker Container Namespaces \- OneUptime, accessed March 13, 2026, [https://oneuptime.com/blog/post/2026-01-30-docker-container-namespaces/view](https://oneuptime.com/blog/post/2026-01-30-docker-container-namespaces/view)  
28. systemd.socket \- Socket unit configuration \- Ubuntu Manpage, accessed March 13, 2026, [https://manpages.ubuntu.com/manpages/jammy/man5/systemd.socket.5.html](https://manpages.ubuntu.com/manpages/jammy/man5/systemd.socket.5.html)  
29. Docker in production \- namespace isolation and networking related issues \- Reddit, accessed March 13, 2026, [https://www.reddit.com/r/docker/comments/vd3xks/docker\_in\_production\_namespace\_isolation\_and/](https://www.reddit.com/r/docker/comments/vd3xks/docker_in_production_namespace_isolation_and/)  
30. tailscaled daemon · Tailscale Docs, accessed March 13, 2026, [https://tailscale.com/docs/reference/tailscaled](https://tailscale.com/docs/reference/tailscaled)  
31. Tailscale Serve · Tailscale Docs, accessed March 13, 2026, [https://tailscale.com/docs/features/tailscale-serve](https://tailscale.com/docs/features/tailscale-serve)  
32. Question: Is it possible to use the devpi-server in an air-gapped network? \#954 \- GitHub, accessed March 13, 2026, [https://github.com/devpi/devpi/discussions/954](https://github.com/devpi/devpi/discussions/954)  
33. How to Run Devpi in Docker (Private PyPI Server) \- OneUptime, accessed March 13, 2026, [https://oneuptime.com/blog/post/2026-02-08-how-to-run-devpi-in-docker-private-pypi-server/view](https://oneuptime.com/blog/post/2026-02-08-how-to-run-devpi-in-docker-private-pypi-server/view)  
34. VS Code Air-Gapped Dev Container by Fabian Heinrich | Medium, accessed March 13, 2026, [https://medium.com/@fabian1heinrich/vscode-airgapped-devcontainer-e18a97bad0b4](https://medium.com/@fabian1heinrich/vscode-airgapped-devcontainer-e18a97bad0b4)  
35. Setting up a strict whitelist proxy server using Squid | Steelmon's tech stuff \- WordPress.com, accessed March 13, 2026, [https://steelmon.wordpress.com/2009/11/22/setting-up-a-strict-whitelist-proxy-server-using-squid/](https://steelmon.wordpress.com/2009/11/22/setting-up-a-strict-whitelist-proxy-server-using-squid/)  
36. Enabling HTTPS · Tailscale Docs, accessed March 13, 2026, [https://tailscale.com/docs/how-to/set-up-https-certificates](https://tailscale.com/docs/how-to/set-up-https-certificates)  
37. How to Audit Ubuntu Servers with Lynis \- OneUptime, accessed March 13, 2026, [https://oneuptime.com/blog/post/2026-01-07-ubuntu-lynis-security-audit/view](https://oneuptime.com/blog/post/2026-01-07-ubuntu-lynis-security-audit/view)  
38. Tailscaled tells systemd that it is ready before its ip address is bindable \#11504 \- GitHub, accessed March 13, 2026, [https://github.com/tailscale/tailscale/issues/11504](https://github.com/tailscale/tailscale/issues/11504)  
39. Waiting on Tailscale \- Forrest Jacobs, accessed March 13, 2026, [https://forrestjacobs.com/waiting-on-tailscale/](https://forrestjacobs.com/waiting-on-tailscale/)  
40. Python pip: What are the ports and IP address ranges in use / that need to be allowed · Issue \#527 · pypi/support \- GitHub, accessed March 13, 2026, [https://github.com/pypi/support/issues/527](https://github.com/pypi/support/issues/527)  
41. Air gap cached modules from one verdaccio docker to an isolated verdaccio docker · verdaccio · Discussion \#5484 \- GitHub, accessed March 13, 2026, [https://github.com/orgs/verdaccio/discussions/5484](https://github.com/orgs/verdaccio/discussions/5484)  
42. Welcome to SearXNG — SearXNG Documentation (2026.3.13+3c1f68c59), accessed March 13, 2026, [https://searxng.org/](https://searxng.org/)  
43. Selfhosting SearXNG \- Medium, accessed March 13, 2026, [https://medium.com/@rosgluk/selfhosting-searxng-a3cb66a196e9](https://medium.com/@rosgluk/selfhosting-searxng-a3cb66a196e9)  
44. SearXNG instances, accessed March 13, 2026, [https://searx.space/](https://searx.space/)  
45. settings.yml — SearXNG Documentation (2025.12.19+8bf600cc6), accessed March 13, 2026, [https://docs.searxng.org/admin/settings/settings](https://docs.searxng.org/admin/settings/settings)  
46. outgoing: — SearXNG Documentation (2026.3.13+3c1f68c59), accessed March 13, 2026, [https://docs.searxng.org/admin/settings/settings\_outgoing.html](https://docs.searxng.org/admin/settings/settings_outgoing.html)  
47. engines: — SearXNG Documentation (2026.3.2+dd98f761a), accessed March 13, 2026, [https://docs.searxng.org/admin/settings/settings\_engines.html](https://docs.searxng.org/admin/settings/settings_engines.html)  
48. Gmail SMTP Settings For 2026 \- Email Warmup, accessed March 13, 2026, [https://emailwarmup.com/blog/smtp/gmail-smtp-settings/](https://emailwarmup.com/blog/smtp/gmail-smtp-settings/)  
49. Route outgoing SMTP relay messages through Google | Set up & manage services, accessed March 13, 2026, [https://knowledge.workspace.google.com/admin/gmail/advanced/route-outgoing-smtp-relay-messages-through-google](https://knowledge.workspace.google.com/admin/gmail/advanced/route-outgoing-smtp-relay-messages-through-google)  
50. The Ultimate Guide to Gmail SMTP Settings in 2026 \- Reply.io, accessed March 13, 2026, [https://reply.io/blog/gmail-smtp-settings/](https://reply.io/blog/gmail-smtp-settings/)  
51. Which SMTP Port to Use? Understanding ports 25, 465, & 587 \- Mailgun, accessed March 13, 2026, [https://www.mailgun.com/blog/email/which-smtp-port-understanding-ports-25-465-587/](https://www.mailgun.com/blog/email/which-smtp-port-understanding-ports-25-465-587/)  
52. Real-Time Financial Data with Alpha Vantage & Yahoo Finance \- PyQuant News, accessed March 13, 2026, [https://www.pyquantnews.com/free-python-resources/real-time-financial-data-with-alpha-vantage-yahoo-finance](https://www.pyquantnews.com/free-python-resources/real-time-financial-data-with-alpha-vantage-yahoo-finance)  
53. Yahoo Finance API \- A Complete Guide \- AlgoTrading101 Blog, accessed March 13, 2026, [https://algotrading101.com/learn/yahoo-finance-api-guide/](https://algotrading101.com/learn/yahoo-finance-api-guide/)  
54. Yahoo Finance API in 2024: Unlocking Financial Data Insights \- Tiingo, accessed March 13, 2026, [https://www.tiingo.com/blog/yahoo-finance-api/](https://www.tiingo.com/blog/yahoo-finance-api/)  
55. OpenClaw security: architecture and hardening guide \- Nebius, accessed March 13, 2026, [https://nebius.com/blog/posts/openclaw-security](https://nebius.com/blog/posts/openclaw-security)  
56. Redirect UFW logs to own file? \- Ask Ubuntu, accessed March 13, 2026, [https://askubuntu.com/questions/452125/redirect-ufw-logs-to-own-file](https://askubuntu.com/questions/452125/redirect-ufw-logs-to-own-file)  
57. Monitor Connect AI agents by using CloudWatch Logs \- AWS Documentation, accessed March 13, 2026, [https://docs.aws.amazon.com/connect/latest/adminguide/monitor-ai-agents.html](https://docs.aws.amazon.com/connect/latest/adminguide/monitor-ai-agents.html)  
58. Audit Logging for AI: What Should You Track (and Where)? | by Pranav Prakash I GenAI I AI/ML I DevOps I | Medium, accessed March 13, 2026, [https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b](https://medium.com/@pranavprakash4777/audit-logging-for-ai-what-should-you-track-and-where-3de96bbf171b)  
59. Squid integration | Grafana Cloud documentation, accessed March 13, 2026, [https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-squid/](https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-squid/)  
60. NXlog – Parsing Squid access logs to json \- Stu Jordan \- WordPress.com, accessed March 13, 2026, [https://stujordan.wordpress.com/2014/10/30/nxlog-parsing-squid-access-logs-to-json/](https://stujordan.wordpress.com/2014/10/30/nxlog-parsing-squid-access-logs-to-json/)  
61. Ingesting log data from Debian UFW to Loki and Grafana | NXLog Blog, accessed March 13, 2026, [https://nxlog.co/news-and-blog/posts/ingest-data-from-debian-ufw-to-loki-grafana](https://nxlog.co/news-and-blog/posts/ingest-data-from-debian-ufw-to-loki-grafana)  
62. Solved: HTTP Event collector Log ingestion \- Splunk Community, accessed March 13, 2026, [https://community.splunk.com/t5/Getting-Data-In/HTTP-Event-collector-Log-ingestion/m-p/483168](https://community.splunk.com/t5/Getting-Data-In/HTTP-Event-collector-Log-ingestion/m-p/483168)  
63. How to force AI Agent to output JSON and add information to it? \- n8n Community, accessed March 13, 2026, [https://community.n8n.io/t/how-to-force-ai-agent-to-output-json-and-add-information-to-it/223514](https://community.n8n.io/t/how-to-force-ai-agent-to-output-json-and-add-information-to-it/223514)  
64. Configure UFW firewall logs on Ubuntu agent to Wazuh dashboard \- Google Groups, accessed March 13, 2026, [https://groups.google.com/g/wazuh/c/sfoKebTtjVw/m/j9QC\_oU2BAAJ](https://groups.google.com/g/wazuh/c/sfoKebTtjVw/m/j9QC_oU2BAAJ)