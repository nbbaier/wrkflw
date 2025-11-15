# Code-First Workflow Engines: Architectural Patterns and Design Decisions

**Research Report**  
*November 2025*

---

## Executive Summary

This report analyzes the architectural patterns and design decisions across modern code-first workflow engines. Based on research of major platforms including Temporal, Airflow, Prefect, Dagster, and others, we identify seven core architectural patterns and key trade-offs that define this space.

**Key Finding:** Despite superficial differences, all code-first workflow engines converge on similar foundational patterns—queue-based task distribution, state machine cores, and separation of orchestration from execution—while diverging significantly in their approach to developer experience, durability guarantees, and domain specialization.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Architectural Patterns](#2-core-architectural-patterns)
3. [Shared Foundations](#3-shared-foundations)
4. [Key Design Trade-offs](#4-key-design-trade-offs)
5. [Evolution and Trends](#5-evolution-and-trends)
6. [Recommendations](#6-recommendations)
7. [References](#7-references)

---

## 1. Introduction

### 1.1 What are Code-First Workflow Engines?

Code-first workflow engines allow developers to define complex, multi-step processes using general-purpose programming languages rather than visual designers or XML configurations. These engines handle orchestration, state management, failure recovery, and coordination of distributed tasks.

### 1.2 Research Scope

This analysis covers:
- **Durable Execution Engines**: Temporal, Cadence, Restate
- **Data Orchestrators**: Airflow, Prefect, Dagster
- **General-Purpose Engines**: Windmill, n8n, Tork
- **Platform-Specific**: Azure Durable Functions, AWS Step Functions

### 1.3 Why This Matters

Workflow engines are critical infrastructure for:
- Distributed transaction coordination (e.g., payment processing, order fulfillment)
- Data pipeline orchestration (ETL, ML training)
- Long-running processes (multi-day workflows, human-in-the-loop)
- Microservice coordination and saga pattern implementation

---

## 2. Core Architectural Patterns

### 2.1 State Persistence & Durability Models

#### Event Sourcing + State Machines

Workflow engines fundamentally operate as state machines that store workflow states and track execution history. The underlying implementation varies significantly:

**Durable Execution Approach (Temporal/Cadence)**

Durable execution engines like Temporal automatically preserve the full state of workflows across failures by persisting every step. This enables workflows to be recovered, replayed, or paused at any arbitrary point. The key innovation is that developers can write code that appears synchronous (including sleeping for 30 days) while the engine handles all persistence and recovery automatically.

**Event-Driven Approach (Infinitic, custom engines)**

Event-driven engines maintain workflow history and trigger tasks based on events, with the workflow engine maintaining state while workers remain stateless. This pattern separates concerns: the engine handles coordination while workers handle execution.

#### Stateless vs. Stateful Engines

**Stateless Engines** (WorkflowEngine .NET, many custom implementations):
- Store process states in external persistent storage (SQL, NoSQL)
- Automatically save and load processes from storage
- Enable horizontal scaling without state synchronization concerns
- Simpler worker implementation but require reliable storage

**Stateful Engines** (Temporal with history service):
- Maintain complete execution history in-memory with durable backing
- Can replay workflows from history to reconstruct state
- More complex coordination but richer debugging capabilities

---

### 2.2 Task Distribution Architecture

#### The Universal Queue-Based Worker Pattern

Every practical workflow engine uses queues to dispatch tasks to workers, avoiding direct task calls to handle flow control, availability, and slowness issues. This is perhaps the most universal pattern across all workflow engines.

**Core Components:**

1. **Coordinator/Orchestrator**
   - Manages workflow lifecycle
   - Tracks job state and failures
   - Routes tasks to appropriate workers
   - Handles retries and timeout logic

2. **Workers**
   - Stateless processes that poll task queues
   - Execute tasks and return results
   - Can be scaled independently of coordinator
   - No state synchronization required between workers

3. **Task Queues**
   - Message brokers (RabbitMQ, Kafka, cloud-native queues)
   - Decouple coordination from execution
   - Provide natural backpressure when workers are busy
   - Enable automatic retry when workers crash

4. **Matching Service** (in sophisticated systems like Temporal)
   - Routes workflow and activity tasks to available workers
   - Acts as task queue manager for the system
   - Handles load balancing and partition management

#### Task Queue Partitioning

Task queues are partitioned for horizontal scaling, allowing multiple nodes to independently handle task delivery and avoid bottlenecks. A single task queue might receive tasks from thousands of workflows and be polled by hundreds of workers. Partitioning prevents hotspots and allows linear scaling.

**Temporal's Approach:**
- 10,000+ shards where each shard stores both workflow state and a queue
- Enables transactional updates across state and queue
- Partitions distribute load across multiple matching service nodes

#### Worker Architecture Details

Workers typically implement:
- **Pollers**: Internal threads that long-poll the cluster for new tasks
- **Thread Pools**: Execute activity tasks with configurable concurrency
- **Slot-Based Concurrency**: Limit simultaneous task execution
- **Heartbeating**: Keep coordinator informed of task progress

---

### 2.3 Transactional Consistency

#### The Critical Challenge

Workflow engines must transactionally update state, task queues, and timers together to avoid race conditions where state and queues become inconsistent. Consider these failure scenarios:

1. **State updates succeed, queue write fails**: System believes task is outstanding but task was never queued
2. **Queue write succeeds, state update is slow**: Task gets delivered and processed before state reflects it was queued
3. **Timer fires, but state is inconsistent**: Workflow may execute duplicate operations

Without transactional guarantees, these edge cases proliferate.

#### Solutions

**Transactional Outbox Pattern (Temporal)**

Temporal uses a partitioned architecture where each shard storing workflow state also stores a queue, enabling transactional commits followed by transfer to the queueing subsystem. The outbox pattern ensures that:
- State changes and queue writes happen atomically within a shard
- Transfer to external queues can retry safely
- Deduplication handles any resulting duplicates

**Single Database Approach (simpler systems)**

Many workflow engines use a single database or even a single process to simplify transactional requirements. This works but doesn't scale:
- Limited throughput (single writer)
- Limited partition tolerance
- Database becomes bottleneck
- Suitable for small to medium deployments

**Saga Pattern for Cross-Service Transactions**

For workflows spanning multiple services, engines implement saga patterns to maintain eventual consistency without distributed transactions.

---

### 2.4 Workflow Definition Paradigms

#### Code-First vs. Config-First

The fundamental choice in workflow definition approach shapes the entire developer experience:

**Code-First Approach**

Workflows defined in general-purpose programming languages (Python, Go, Java, TypeScript) that are executed by the engine.

*Advantages:*
- Full programming language power (loops, conditionals, functions)
- Type safety and IDE support
- Easier unit testing and debugging
- Version control friendly
- Can leverage existing libraries and frameworks

*Disadvantages:*
- Airflow workflows require redeployment when they change since they're written in Python
- Requires programming knowledge
- Can't be easily edited by non-technical users
- Potential for overcomplication

**Examples**: Temporal, Prefect, Dagster, Airflow

**Config-First Approach**

Workflows written in YAML/JSON don't require engine redeployment when changed.

*Advantages:*
- Keeping rules as data instead of code means no recompilation and allows runtime changes
- Non-technical users can understand and edit workflows
- Clear separation between workflow logic and implementation
- Easier to generate workflows programmatically

*Disadvantages:*
- Limited expressiveness (no or limited control flow)
- Version control and diff tracking more challenging
- YAML complexity can become unwieldy
- Limited type safety

**Examples**: AWS Step Functions (JSON), many traditional BPM engines, Kubernetes workflows

#### The Hybrid Revolution

Modern systems increasingly adopt hybrid approaches:

**Dagster Components**

Dagster Components allow mixing declarative YAML DSLs with imperative Python code for common patterns. Teams can:
- Use YAML for standardized, repeated patterns (e.g., data extraction)
- Fall back to Python for complex custom logic
- Create organization-specific DSLs
- Abstract away implementation details while maintaining flexibility

**Windmill's Approach**

Windmill lets engineers write scripts in multiple languages (Python, TypeScript, Go) and compose them into workflows via visual DAG editor. This provides:
- Script development in familiar languages
- Visual composition of workflows
- Auto-generated UIs and APIs
- Best of both worlds: code flexibility with visual orchestration

---

### 2.5 Orchestration vs. Choreography

Distributed workflows can be coordinated through two fundamental patterns:

#### Orchestration Pattern

A central orchestrator tells participants what local transactions to execute. Temporal follows the orchestrator variant of the Saga pattern where a centralized coordinator tracks workflow progress and dispatches commands.

**Characteristics:**
- Single service/component coordinates entire workflow
- Explicit workflow definition visible in one place
- Clear causality and execution order
- Easier debugging and monitoring

**Advantages:**
- Centralized visibility and control
- Single source of truth for workflow state
- Easier to understand end-to-end flow
- Better for complex workflows with many decision points

**Disadvantages:**
- Single point of failure (requires HA setup)
- Orchestrator can become bottleneck
- Tight coupling to orchestrator
- Orchestrator must know about all participants

**Best For:**
- Complex workflows with many steps
- Workflows requiring centralized decision logic
- When observability is critical
- Financial transactions, order processing

#### Choreography Pattern

Each local transaction publishes domain events that trigger local transactions in other services. Services react to each other's operations without a central conductor, avoiding single point of failure.

**Characteristics:**
- Decentralized coordination
- Services respond to events autonomously
- No central coordinator required
- Implicit workflow through event chains

**Advantages:**
- No single point of failure
- Loose coupling between services
- Natural event-driven architecture fit
- Services can evolve independently

**Disadvantages:**
- Harder to track overall workflow state
- Implicit dependencies difficult to visualize
- Debugging spans multiple services
- Risk of cyclic dependencies

**Best For:**
- Event-driven architectures
- Loosely coupled microservices
- When services should be autonomous
- Simpler workflows with clear event flows

#### Hybrid Patterns

Many real-world systems combine both:
- Orchestration for critical paths requiring visibility
- Choreography for loosely coupled background processes
- Orchestration within bounded contexts, choreography across them

---

### 2.6 Data Orchestration-Specific Patterns

Data orchestration engines have evolved domain-specific patterns:

#### Asset-Centric vs. Task-Centric

**Asset-Centric Model (Dagster)**

Dagster treats data assets (tables, models, reports) as first-class citizens with dependencies, lineage, and state management central to orchestration. The focus shifts from "what tasks to run" to "what data should exist."

*Key Concepts:*
- **Software-Defined Assets**: Tables, ML models defined as code
- **Asset Materialization**: Creating or updating an asset
- **Asset Lineage**: Automatic dependency tracking
- **Asset Metadata**: Quality metrics, ownership, documentation
- **Freshness Policies**: Declarative data SLAs

*Benefits:*
- Natural fit for data platform thinking
- Built-in data cataloging
- Asset-level observability
- Incremental materialization
- Clear ownership boundaries

**Task-Centric Model (Airflow, Prefect)**

Traditional DAG-based approach where tasks and their dependencies are primary abstractions. Prefect's task-based model is imperative - developers define exact sequence of steps rather than describing desired end states.

*Key Concepts:*
- **Tasks**: Individual units of work
- **DAGs**: Directed acyclic graphs of task dependencies
- **Operators**: Reusable task templates
- **XComs**: Cross-task communication
- **Task Groups**: Logical grouping of related tasks

*Benefits:*
- Intuitive for ETL thinking
- Rich operator ecosystem
- Fine-grained control over execution
- Familiar to most data engineers

#### Scheduler Architecture Differences

**Airflow:**
- Centralized scheduler with metadata database
- Distributed workers (Celery, Kubernetes, LocalExecutor)
- DAGs parsed continuously from Python files
- Shared metadata store across components

**Prefect:**
- Separates orchestration (Cloud/Server) from execution
- Agents poll for work and execute in any environment
- Scheduler doesn't need network ingress to workers
- Hybrid and edge-friendly architecture

**Dagster:**
- Separates daemon (schedulers/sensors) from user code
- User code packaged as gRPC servers
- Loaded dynamically into web UI (Dagit)
- Isolation of dependency trees reduces scheduler load

---

### 2.7 Failure Handling & Compensation

#### The Saga Pattern for Distributed Transactions

Sagas enable orchestrating multi-step workflows across services, with each step providing compensating actions for rollback when failures occur. This is critical in microservices where traditional ACID transactions don't span services.

**Saga Characteristics:**

Sagas are coordinating objects implemented as state machines that listen for events and instruct other parts of the system. The key distinction between saga variants:

- **Pure Sagas**: No internal state; decisions based entirely on incoming messages
- **Process Managers**: Maintain state; act as state machines making decisions based on state and events

**Implementation Pattern:**

1. **Forward Operations**: Each step in workflow performs business operation
2. **Compensating Actions**: Each step defines how to undo its operation
3. **Coordination**: Orchestrator or choreography coordinates execution
4. **Rollback**: On failure, execute compensating actions in reverse

**Example: Order Processing**

```
Normal Flow:
1. Reserve Inventory → Compensate: Release Inventory
2. Charge Payment → Compensate: Refund Payment  
3. Ship Order → Compensate: Cancel Shipment

Failure Scenario:
1. Reserve Inventory ✓
2. Charge Payment ✓
3. Ship Order ✗ (fails)
→ Execute: Refund Payment, Release Inventory
```

#### Built-In Retry & Durability

Modern workflow engines provide sophisticated retry mechanisms:

**Temporal Activities:**
- Built-in support for timeouts and retries
- Configurable retry policies (exponential backoff, max attempts)
- Automatic recovery with resume from last checkpoint
- Activities can run for days with automatic heartbeating

**Benefits of Durable Execution:**
- Simpler codebase with fewer bugs
- Comprehensive test coverage through replay capabilities
- Can simulate failures and test compensation logic
- Time travel debugging

---

### 2.8 Scaling Dimensions

#### Horizontal Scalability Strategies

Modern workflow engines must scale along multiple dimensions:

**1. Sharding for Parallelism**

Sharding enables executing millions of tasks by distributing workflow state across many partitions. Temporal uses 10,000+ shards where each shard stores both workflow state and a queue for transactional updates.

**2. Worker Pool Scaling**

Workers scale independently:
- Add workers to increase task throughput
- Remove workers to reduce costs
- No state coordination needed
- Auto-scaling based on queue depth

**3. Task Queue Separation**

Multiple task queues for different workloads allow isolation of CPU-intensive vs. I/O-bound tasks with independent autoscaling. For example:
- GPU-intensive ML training on dedicated workers
- I/O-bound API calls on different workers
- Prevents resource contention
- Independent scaling policies per workload type

**4. Database Scaling**

Different approaches to scaling the persistence layer:
- **Sharding**: Partition state across multiple databases
- **Replication**: Read replicas for query workloads
- **Caching**: In-memory caches for hot workflows
- **Time-series optimization**: Archival of old execution data

#### Worker Architecture for Scale

Workers implement sophisticated patterns:

**Pollers**
- Internal threads that long-poll the cluster for new tasks
- Configurable poller count controls task pickup speed
- Long-polling reduces network overhead vs. short polling
- Pollers don't execute tasks, just retrieve them

**Execution Threads**
- Separate thread pool for actual task execution
- Configurable concurrency limits per worker
- Slot-based concurrency prevents overload
- Graceful degradation under pressure

**Heartbeating**
- Workers periodically report task progress
- Coordinator can detect worker failures
- Enables task timeout and reassignment
- Critical for long-running tasks

---

## 3. Shared Foundations

Despite significant architectural differences, code-first workflow engines converge on several fundamental patterns:

### 3.1 Queue-Based Task Distribution

**Universal adoption** of message queues for task dispatch:
- Decouples coordination from execution
- Provides natural backpressure
- Enables retry and failure recovery
- Facilitates horizontal scaling

No successful workflow engine attempts direct synchronous task invocation at scale.

### 3.2 State Machine Core

All workflow engines model execution as state transitions:
- Workflows define valid states and transitions
- Events trigger state changes
- State changes may trigger actions (task dispatch)
- Current state determines valid next actions

Even engines with imperative code interfaces (Temporal) internally maintain state machines.

### 3.3 Retry and Timeout Mechanisms

Built-in fault tolerance is non-negotiable:
- Configurable retry policies
- Exponential backoff
- Max retry limits
- Timeout detection
- Automatic task reassignment on failure

These shouldn't be the application's responsibility.

### 3.4 Event-Driven Triggers

Moving beyond pure scheduling to reactive execution:
- Scheduled triggers (cron-like)
- Event triggers (message arrives, file uploaded)
- API triggers (webhook, HTTP request)
- Manual triggers (human intervention)
- Sensor triggers (external system state change)

Modern workflows react to the world, not just the clock.

### 3.5 Observability Focus

Rich UIs for monitoring, debugging, and understanding execution state:
- Real-time workflow status
- Execution history and audit trails
- Performance metrics and bottleneck detection
- Error tracking and alerting
- Dependency visualization

Durable execution ensures every step of code execution can be tracked and viewed, enabling quick diagnosis of issues.

### 3.6 Separation of Concerns

Coordination logic separate from business logic:
- Orchestration engine handles: scheduling, retries, state, queuing
- Application code handles: business logic, data transformation
- Clean interfaces between layers
- Business logic doesn't deal with infrastructure concerns

This separation is critical for testability and maintainability.

---

## 4. Key Design Trade-offs

### 4.1 Developer Experience vs. Operational Complexity

**The Trade-off:**

Airflow has significant operational overhead (scheduler, workers, metadata DB, message queue) but provides a vast ecosystem of operators and integrations. Prefect emphasizes simplicity with a "negative engineering" philosophy—assuming developers know how to code and removing unnecessary abstractions. Dagster takes a first-principles approach with the full development lifecycle in mind, from development to deployment to monitoring.

**Implications:**

- **Airflow**: Best for teams with DevOps resources, need for battle-tested stability
- **Prefect**: Best for agile teams wanting rapid iteration
- **Dagster**: Best for data platform teams wanting end-to-end lifecycle management

Early workflow systems like AWS Simple Workflow Service (SWF) struggled with adoption despite being conceptually advanced due to challenging developer experience. The lesson: power without usability leads to low adoption.

### 4.2 Flexibility vs. Guardrails

**The Spectrum:**

- **Full Code Flexibility** (Temporal): Any code in workflow, full language power
  - Pro: Can express anything
  - Con: Can shoot yourself in foot, hard to enforce standards

- **Constrained Frameworks** (Airflow with TaskFlow API): Structured patterns with some flexibility
  - Pro: Best practices built-in
  - Con: Sometimes need to work around framework

- **Declarative DSLs** (YAML workflows): Limited to defined constructs
  - Pro: Prevents entire classes of errors
  - Con: May not express all needs

Modern platforms aim to provide flexibility with visibility and guardrails enterprises need to move fast without breaking things.

### 4.3 Monolithic vs. Distributed

**Historical Context:**

Traditional workflow engines were often designed to run as single process and not distributed, limiting scalability. This was acceptable when workflows were departmental tools, not production infrastructure.

**Modern Requirements:**

- Multi-region deployment
- Fault tolerance across availability zones
- Elastic scaling
- Multi-tenancy

Modern engines embrace distributed architecture from the start, but this adds complexity.

### 4.4 Real-Time vs. Batch

**Historical Focus:**

Airflow historically focused on scheduled batch jobs (nightly ETL, daily reports). This made sense when data was batch-oriented.

**Modern Reality:**

Prefect and Dagster offer superior event-native design for real-time pipelines. Airflow 3.0 (April 2025) improved event-driven capabilities but still carries batch-oriented legacy.

**Trade-off:**

- Batch-oriented systems optimize for throughput and resource efficiency
- Real-time systems optimize for latency and responsiveness
- Hard to excel at both simultaneously

### 4.5 Generalization vs. Specialization

**General-Purpose Engines** (Temporal, Prefect):
- Can orchestrate anything
- No domain assumptions
- Broadly applicable

**Domain-Specific Engines** (Dagster for data):
- Optimized for specific use cases
- Domain-specific features (asset lineage, data quality)
- Steeper learning curve for other domains

The trend is toward general engines with domain-specific extensions.

---

## 5. Evolution and Trends

### 5.1 Historical Evolution

**Phase 1: Traditional BPM (2000s)**
- BPMN/BPEL based
- XML configuration
- Heavy enterprise focus
- Visual designers
- Examples: jBPM, Activiti, Camunda

**Phase 2: Code-First Data (2010s)**
- Python-based DAGs
- Data engineering focus
- Scheduled batch jobs
- Example: Airflow (2014)

**Phase 3: Modern Durable Execution (2015-2020)**
- Workflow-as-code
- Built-in resilience
- Language-native SDKs
- Examples: Cadence (2016), Temporal (2019)

**Phase 4: Asset-Centric & Declarative (2020+)**
- Data as first-class citizen
- Hybrid code/config approaches
- Developer experience focus
- Examples: Dagster Components (2025), modern Prefect

### 5.2 Current Trends

**1. Convergence on Event-Driven**

All engines moving toward event-native architectures:
- Airflow 3.0 added event-driven scheduling
- Prefect built event-driven from start
- Temporal supports signals and queries for external events

**2. AI/ML Workload Support**

Specialized features for AI/ML:
- Long-running training jobs
- GPU resource management
- Model versioning and lineage
- Experiment tracking integration

**3. Hybrid Cloud & Edge**

Workflows must run anywhere:
- Multi-cloud support
- Edge deployment (Prefect's agent model)
- Air-gapped environments
- Kubernetes-native

**4. Developer Experience Revolution**

Focus on DX improvements:
- Local development modes
- Fast feedback loops
- Testing frameworks
- Time-travel debugging
- Branch deployments (Dagster)

**5. Platform Consolidation**

Engines absorbing adjacent concerns:
- Data cataloging (Dagster)
- Data quality checks
- Cost management
- Observability
- Reducing tool sprawl

### 5.3 Future Directions

**Predicted Evolutions:**

1. **AI-Assisted Workflow Development**
   - LLM-generated workflows from natural language
   - Automatic optimization suggestions
   - Intelligent error recovery

2. **Multi-Model Orchestration**
   - Seamless mix of code, config, visual
   - DSLs for common patterns
   - Full code for edge cases

3. **Deeper Cloud Integration**
   - Native serverless execution
   - Zero-operations deployment
   - Automatic scaling without config

4. **Cross-Organization Workflows**
   - Workflow federation
   - Inter-company orchestration
   - Privacy-preserving coordination

---

## 6. Recommendations

### 6.1 Choosing a Workflow Engine

**For Data/Analytics Teams:**

- **Start with Dagster** if:
  - Building a modern data platform
  - Need strong data lineage and cataloging
  - Have strong Python skills
  - Want asset-centric thinking

- **Choose Airflow** if:
  - Already invested in Airflow ecosystem
  - Need 2000+ community operators
  - Have DevOps resources for operation
  - Batch-oriented workflows

- **Consider Prefect** if:
  - Want rapid development
  - Need hybrid/edge deployment
  - Prefer minimal operational overhead
  - Dynamic, event-driven workflows

**For Distributed Systems/Microservices:**

- **Choose Temporal** if:
  - Need rock-solid reliability guarantees
  - Implementing saga patterns
  - Long-running processes (days/weeks)
  - Multi-step transactions across services
  - Critical business processes (payments, orders)

**For General Automation:**

- **Choose Windmill** if:
  - Need multi-language support
  - Want low-code components with code flexibility
  - Building internal tools
  - Small to medium team

- **Choose n8n** if:
  - Need extensive API integrations
  - Low-code with code fallback
  - Business process automation
  - Non-technical users involved

### 6.2 Architectural Guidelines

**When Building Custom Workflows:**

1. **Always use queues for task distribution**
   - Don't do synchronous RPC between coordinator and workers
   - Queues provide natural backpressure and retry

2. **Ensure transactional consistency**
   - Use outbox pattern or single-database approach
   - Never update state and queues without transactions
   - Edge cases will bite you

3. **Make workers stateless**
   - All state in coordinator/database
   - Enables trivial horizontal scaling
   - Simplifies failure recovery

4. **Implement comprehensive observability**
   - Log all state transitions
   - Provide execution history
   - Enable time-travel debugging
   - Visualize dependencies

5. **Support local development**
   - Workflows should run on developer laptop
   - Fast feedback loops
   - Testability is critical

6. **Design for failure**
   - Assume anything can fail anytime
   - Implement compensating actions
   - Make operations idempotent
   - Test failure scenarios

### 6.3 Migration Strategies

**From Homegrown to Managed Engine:**

1. **Start with new workflows** - Don't migrate everything
2. **Run in parallel** - Prove stability before switching
3. **Choose based on team skills** - Don't fight your team's strengths
4. **Consider operational burden** - Factor in ongoing costs
5. **Evaluate vendor lock-in** - Prefer open-source or standard APIs

**Incremental Migration Path:**

Many engines (especially Dagster) support observing existing systems:
- Wrap existing Airflow DAGs
- Gradually migrate workflows
- Maintain visibility across both systems
- Reduce risk of big-bang migration

---

## 7. References

### Primary Sources

**Temporal/Durable Execution:**
- Temporal Engineering Blog: "Designing a Workflow Engine from First Principles"
- Temporal Documentation: "How Temporal Works"
- "Durable Execution in Distributed Systems" by Temporal

**Data Orchestration:**
- "Orchestration Showdown: Dagster vs Prefect vs Airflow" (ZenML, November 2025)
- "Dagster vs Airflow: Comparing Top Data Orchestration Tools" (DataCamp, 2024)
- "Airflow vs Prefect vs Dagster" (Galaxy, 2025)

**Patterns & Architecture:**
- "Saga and Process Manager" (Event-Driven.io)
- Microservices.io: "Pattern: Saga"
- "Events, Sagas and Workflows: Managing Long-Running Processes"

**Community Resources:**
- awesome-workflow-engines (GitHub)
- SE Radio: "Maxim Fateev on Durable Execution with Temporal"
- Various Stack Overflow discussions on workflow patterns

### Key Papers & Talks

- Hector Garcia-Molina & Kenneth Salem (1987): Original Saga pattern paper
- Systems @ Scale 2021: Workflow engine design principles
- Various conference talks on Temporal, Airflow, Dagster evolution

---

## Appendix A: Comparison Matrix

| Feature | Temporal | Airflow | Prefect | Dagster |
|---------|----------|---------|---------|---------|
| **Primary Use Case** | Distributed transactions | Data pipelines | General workflows | Data platforms |
| **Definition Style** | Code-first (Python, Go, Java, TS) | Code-first (Python DAGs) | Code-first (Python) | Asset-centric (Python) |
| **State Model** | Durable execution, full replay | Metadata DB, task state | Event-driven, state streams | Asset materialization state |
| **Scheduling** | Event + cron | Primarily cron | Event-native | Asset-aware, event-driven |
| **Deployment** | Self-hosted or cloud | Self-hosted (complex) | Cloud or self-hosted | Self-hosted or cloud |
| **Scalability** | 10,000+ shards | Horizontal via executors | Agent-based elastic | gRPC user code isolation |
| **Best For** | Mission-critical transactions | Established ETL pipelines | Rapid development | Modern data platforms |
| **Learning Curve** | Moderate | Steep | Gentle | Moderate |
| **Operational Overhead** | Moderate | High | Low | Moderate |
| **Community Size** | Growing | Very large | Growing | Growing rapidly |

---

## Appendix B: Glossary

**Activity**: A single unit of work in a workflow, typically a function or service call.

**Asset**: In data orchestration, a data object like a table or model that has dependencies and lineage.

**Choreography**: Coordination pattern where services react to events without central orchestrator.

**Compensating Action**: Undo operation for a completed workflow step, used in saga rollback.

**DAG (Directed Acyclic Graph)**: Structure representing workflow steps and their dependencies.

**Durable Execution**: Programming model where code execution state persists automatically across failures.

**Orchestration**: Coordination pattern where central service directs other services.

**Saga**: Long-running transaction pattern with compensating actions for rollback.

**Shard**: Partition of workflow state for horizontal scaling.

**Task Queue**: Message queue holding work items for workers to process.

**Worker**: Stateless process that executes workflow tasks.

**Workflow**: Multi-step process with defined coordination and error handling.

---

## Appendix C: Code Examples

### Example 1: Temporal Workflow (Python)

```python
from datetime import timedelta
from temporalio import workflow, activity

@activity.defn
async def send_email(recipient: str) -> None:
    # Send email logic
    print(f"Email sent to {recipient}")

@workflow.defn
class SubscriptionWorkflow:
    @workflow.run
    async def run(self, user_id: str) -> str:
        # Day 1: Welcome email
        await workflow.execute_activity(
            send_email,
            user_id,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        # Wait 7 days
        await workflow.sleep(timedelta(days=7))
        
        # Day 8: Follow-up email
        await workflow.execute_activity(
            send_email,
            user_id,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        return f"Campaign complete for {user_id}"
```

### Example 2: Airflow DAG (Python)

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

def extract_data():
    # Extract logic
    return "data"

def transform_data(ti):
    data = ti.xcom_pull(task_ids='extract')
    # Transform logic
    return f"transformed_{data}"

def load_data(ti):
    data = ti.xcom_pull(task_ids='transform')
    # Load logic
    print(f"Loading {data}")

with DAG(
    'etl_pipeline',
    schedule_interval=timedelta(days=1),
    start_date=datetime(2025, 1, 1),
    catchup=False
) as dag:
    
    extract = PythonOperator(
        task_id='extract',
        python_callable=extract_data
    )
    
    transform = PythonOperator(
        task_id='transform',
        python_callable=transform_data
    )
    
    load = PythonOperator(
        task_id='load',
        python_callable=load_data
    )
    
    extract >> transform >> load
```

### Example 3: Dagster Assets (Python)

```python
from dagster import asset, AssetExecutionContext

@asset
def raw_customers(context: AssetExecutionContext):
    """Extract raw customer data"""
    # Fetch from API
    return fetch_customers()

@asset(deps=[raw_customers])
def cleaned_customers(context: AssetExecutionContext):
    """Clean and validate customer data"""
    # Load raw data
    raw = load_asset("raw_customers")
    # Clean data
    return clean_data(raw)

@asset(deps=[cleaned_customers])
def customer_metrics(context: AssetExecutionContext):
    """Calculate customer metrics"""
    cleaned = load_asset("cleaned_customers")
    return calculate_metrics(cleaned)
```

### Example 4: Prefect Flow (Python)

```python
from prefect import flow, task
from datetime import timedelta

@task(retries=3, retry_delay_seconds=60)
def fetch_data(url: str):
    # Fetch logic with automatic retries
    return fetch_from_api(url)

@task
def process_data(data):
    # Processing logic
    return processed_data

@flow(log_prints=True)
def etl_flow(source_url: str):
    raw_data = fetch_data(source_url)
    processed = process_data(raw_data)
    return processed

# Run flow
if __name__ == "__main__":
    etl_flow("https://api.example.com/data")
```

---

## Document Information

**Report Version**: 1.0  
**Publication Date**: November 2025  
**Author**: Research Analysis  
**Status**: Final

**Change Log**:
- v1.0 (Nov 2025): Initial comprehensive report

**Contact**: For questions or feedback about this report, please refer to the research methodology and sources cited.

---

*End of Report*
