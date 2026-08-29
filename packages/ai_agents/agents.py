import time
import json
from typing import Any
from apps.api.services.ai_service import AIService
from packages.ai_agents.schemas import (
    AgentResult, AgentType, FindingItem, RecommendationItem, EvidenceItem
)
from packages.ai_agents.tools import ControlledAgentTools

# --- 1. Disaster Intelligence Agent ---
class DisasterIntelligenceAgent:
    def __init__(self, ai_service: AIService, tools: ControlledAgentTools) -> None:
        self.ai_service = ai_service
        self.tools = tools

    async def execute(self, query: str) -> AgentResult:
        start = time.time()
        active_disasters = await self.tools.get_active_disasters()
        
        findings = []
        evidence = []
        recommendations = []

        for d in active_disasters:
            findings.append(FindingItem(
                category="ACTIVE_HAZARD",
                fact=f"Disaster '{d['title']}' ({d['disaster_type']}) active in {d['affected_state']} with severity {d['severity']}.",
                is_database_result=True,
                reference_id=d["id"]
            ))
            evidence.append(EvidenceItem(
                source_type="PostGIS Database",
                source_name="disaster_events",
                data_summary=f"Event ID {d['id']}: {d['title']} ({d['severity']})"
            ))

        if active_disasters:
            recommendations.append(RecommendationItem(
                action="Maintain 5km impact buffer monitoring around active hazard epicenters.",
                reasoning="Active flood and landslide hazard polygons pose ongoing structural threats to transit corridors.",
                requires_human_approval=True,
                safety_override_active=False
            ))

        # LLM Synthesis via LatentStack
        system_prompt = "You are the Disaster Intelligence Agent for NER India. Summarize disaster hazards based strictly on database evidence."
        user_prompt = f"Query: {query}\nDatabase Evidence: {json.dumps(active_disasters)}"
        
        try:
            llm_res = await self.ai_service.execute_prompt(system_prompt, user_prompt)
            summary = llm_res.content
        except Exception:
            summary = f"Identified {len(active_disasters)} active disaster hazards in the North Eastern Region based on PostGIS records."

        elapsed_ms = int((time.time() - start) * 1000)
        return AgentResult(
            agent_name="DisasterIntelligenceAgent",
            agent_type=AgentType.DISASTER,
            status="SUCCESS",
            summary=summary,
            findings=findings,
            recommendations=recommendations,
            evidence=evidence,
            confidence_score=0.95,
            execution_time_ms=elapsed_ms
        )

# --- 2. Route Intelligence Agent ---
class RouteIntelligenceAgent:
    def __init__(self, ai_service: AIService, tools: ControlledAgentTools) -> None:
        self.ai_service = ai_service
        self.tools = tools

    async def execute(self, query: str) -> AgentResult:
        start = time.time()
        affected_roads = await self.tools.get_affected_roads()
        all_roads = await self.tools.get_all_road_corridors()

        findings = []
        evidence = []
        recommendations = []
        warnings = []

        # Deterministic Safety Rules
        for r in all_roads:
            if r["current_status"] in ["BLOCKED", "IMPASSABLE"]:
                findings.append(FindingItem(
                    category="ROAD_BLOCKAGE",
                    fact=f"Corridor {r['highway_code']} ({r['segment_name']}) is hard-blocked ({r['current_status']}).",
                    is_database_result=True,
                    reference_id=r["id"]
                ))
                warnings.append(f"DETERMINISTIC SAFETY OVERRIDE: {r['highway_code']} is {r['current_status']}! Route automatically marked UNSAFE.")
                recommendations.append(RecommendationItem(
                    action=f"Prohibit heavy logistics transit on {r['highway_code']}.",
                    reasoning="Hard deterministic safety block override triggered due to verified structural/landslide blockage.",
                    requires_human_approval=True,
                    safety_override_active=True
                ))

        for ar in affected_roads:
            evidence.append(EvidenceItem(
                source_type="PostGIS Spatial Intersection",
                source_name="road_segments x disaster_events.impact_zone",
                data_summary=f"Highway {ar['highway_code']} ({ar['segment_name']}) intersects active disaster polygon."
            ))

        system_prompt = "You are the Route Intelligence Agent for NER India. Explain road corridor risks based on PostGIS intersection facts."
        user_prompt = f"Query: {query}\nAffected Intersecting Corridors: {json.dumps(affected_roads)}"

        try:
            llm_res = await self.ai_service.execute_prompt(system_prompt, user_prompt)
            summary = llm_res.content
        except Exception:
            summary = f"Evaluated {len(all_roads)} highway corridors. Found {len(affected_roads)} corridors intersecting disaster impact zones."

        elapsed_ms = int((time.time() - start) * 1000)
        return AgentResult(
            agent_name="RouteIntelligenceAgent",
            agent_type=AgentType.ROUTE,
            status="SUCCESS",
            summary=summary,
            findings=findings,
            recommendations=recommendations,
            evidence=evidence,
            confidence_score=0.92,
            warnings=warnings,
            execution_time_ms=elapsed_ms
        )

# --- 3. Logistics & Resource Agent ---
class LogisticsResourceAgent:
    def __init__(self, ai_service: AIService, tools: ControlledAgentTools) -> None:
        self.ai_service = ai_service
        self.tools = tools

    async def execute(self, query: str) -> AgentResult:
        start = time.time()
        hubs_data = await self.tools.get_logistics_hubs_and_inventory()

        findings = []
        evidence = []
        recommendations = []
        warnings = []

        total_inventory_items = 0
        for h in hubs_data:
            evidence.append(EvidenceItem(
                source_type="PostgreSQL Database",
                source_name="logistics_hubs & inventory_items",
                data_summary=f"Hub '{h['name']}' ({h['state']}): {len(h['inventory'])} inventory categories stored."
            ))
            for item in h["inventory"]:
                total_inventory_items += 1
                if item["quantity"] < 200.0:
                  warnings.append(f"LOW STOCK ALERT: {item['item_name']} at {h['name']} has only {item['quantity']} {item['unit']} remaining.")
                  recommendations.append(RecommendationItem(
                      action=f"Propose inventory replenishment for {item['item_name']} at {h['name']}.",
                      reasoning=f"Stock level ({item['quantity']} {item['unit']}) fallen below safety threshold of 200 units.",
                      requires_human_approval=True,
                      safety_override_active=False
                  ))

        system_prompt = "You are the Logistics & Resource Agent for NER India. Summarize depot inventories and supply readiness."
        user_prompt = f"Query: {query}\nHubs Inventory: {json.dumps(hubs_data)}"

        try:
            llm_res = await self.ai_service.execute_prompt(system_prompt, user_prompt)
            summary = llm_res.content
        except Exception:
            summary = f"Assessed {len(hubs_data)} logistics hubs containing {total_inventory_items} tracked supply line items."

        elapsed_ms = int((time.time() - start) * 1000)
        return AgentResult(
            agent_name="LogisticsResourceAgent",
            agent_type=AgentType.LOGISTICS,
            status="SUCCESS",
            summary=summary,
            findings=findings,
            recommendations=recommendations,
            evidence=evidence,
            confidence_score=0.94,
            warnings=warnings,
            execution_time_ms=elapsed_ms
        )

# --- 4. Research & Historical Data Agent ---
class ResearchHistoricalAgent:
    def __init__(self, ai_service: AIService, tools: ControlledAgentTools) -> None:
        self.ai_service = ai_service
        self.tools = tools

    async def execute(self, query: str) -> AgentResult:
        start = time.time()
        findings = [
            FindingItem(
                category="HISTORICAL_PATTERN",
                fact="Historical analog: Monsoonal highway closures on NH-6 (East Khasi Hills) average 3-5 days recovery duration during heavy rainfall events (>150mm/24h).",
                is_database_result=False,
                reference_id="NER-HIST-2022-ASSAM-MEGHALAYA"
            )
        ]
        evidence = [
            EvidenceItem(
                source_type="Synthetic Historical Dataset",
                source_name="NER Historical Disaster Analogs (2018-2023)",
                data_summary="Assam & Meghalaya severe flood/landslide recovery historical statistics."
            )
        ]

        system_prompt = "You are the Research & Historical Data Agent for NER India. Provide historical context on monsoon recovery patterns."
        user_prompt = f"Query: {query}\nHistorical Patterns: NH-6 Shillong corridor landslide duration history."

        try:
            llm_res = await self.ai_service.execute_prompt(system_prompt, user_prompt)
            summary = llm_res.content
        except Exception:
            summary = "Historical analysis indicates landslide disruptions on major NER hill corridors typically require 48-72 hours for heavy equipment clearing."

        elapsed_ms = int((time.time() - start) * 1000)
        return AgentResult(
            agent_name="ResearchHistoricalAgent",
            agent_type=AgentType.RESEARCH,
            status="SUCCESS",
            summary=summary,
            findings=findings,
            recommendations=[],
            evidence=evidence,
            confidence_score=0.88,
            execution_time_ms=elapsed_ms
        )

# --- 5. Supervisor Orchestrator Agent ---
class SupervisorAgent:
    def __init__(self, ai_service: AIService, tools: ControlledAgentTools) -> None:
        self.ai_service = ai_service
        self.tools = tools
        self.disaster_agent = DisasterIntelligenceAgent(ai_service, tools)
        self.route_agent = RouteIntelligenceAgent(ai_service, tools)
        self.logistics_agent = LogisticsResourceAgent(ai_service, tools)
        self.research_agent = ResearchHistoricalAgent(ai_service, tools)

    async def orchestrate(self, query: str) -> dict[str, Any]:
        start = time.time()
        query_lower = query.lower()

        # Construct Execution Plan based on query keywords
        plan = []
        agents_to_run = []

        # Intent classification
        if any(w in query_lower for w in ["flood", "landslide", "disaster", "hazard", "risk", "shillong", "guwahati", "sikkim", "active"]):
            plan.append("Execute DisasterIntelligenceAgent to identify active hazards & impact zones.")
            agents_to_run.append(self.disaster_agent)

        if any(w in query_lower for w in ["route", "highway", "nh-27", "nh-6", "road", "avoid", "reroute", "corridor", "transport"]):
            plan.append("Execute RouteIntelligenceAgent to evaluate corridor viability & deterministic blocks.")
            agents_to_run.append(self.route_agent)

        if any(w in query_lower for w in ["hub", "depot", "supply", "food", "water", "inventory", "stock", "material", "resource", "logistics"]):
            plan.append("Execute LogisticsResourceAgent to inspect inventory levels and depot readiness.")
            agents_to_run.append(self.logistics_agent)

        # Default fallback: run all 3 primary domain agents if query is broad
        if not agents_to_run:
            plan = [
                "Execute DisasterIntelligenceAgent to evaluate active disaster events.",
                "Execute RouteIntelligenceAgent to evaluate highway corridor risks.",
                "Execute LogisticsResourceAgent to check depot inventory readiness.",
            ]
            agents_to_run = [self.disaster_agent, self.route_agent, self.logistics_agent]

        # Always add research agent for contextual history if requested or relevant
        if "history" in query_lower or "pattern" in query_lower or "past" in query_lower:
            plan.append("Execute ResearchHistoricalAgent for historical pattern matching.")
            agents_to_run.append(self.research_agent)

        # Execute agents sequentially
        agent_results: list[AgentResult] = []
        all_recommendations: list[RecommendationItem] = []
        all_evidence: list[EvidenceItem] = []
        all_warnings: list[str] = []

        for agent in agents_to_run:
            try:
                res = await agent.execute(query)
                agent_results.append(res)
                all_recommendations.extend(res.recommendations)
                all_evidence.extend(res.evidence)
                all_warnings.extend(res.warnings)
            except Exception as exc:
                agent_results.append(AgentResult(
                    agent_name=agent.__class__.__name__,
                    agent_type=AgentType.SUPERVISOR,
                    status="FAILED",
                    summary=f"Agent execution failed gracefully: {str(exc)}",
                    confidence_score=0.0,
                    warnings=[f"Error during {agent.__class__.__name__} execution: {str(exc)}"]
                ))

        # Synthesize final summary
        system_prompt = "You are the Chief Command Supervisor for NER Disaster Logistics Intelligence. Synthesize findings into a concise, professional operational briefing."
        user_prompt = f"User Operational Query: {query}\nSpecialist Agent Results:\n" + "\n".join([f"- {r.agent_name}: {r.summary}" for r in agent_results])

        try:
            llm_synthesis = await self.ai_service.execute_prompt(system_prompt, user_prompt)
            final_summary = llm_synthesis.content
        except Exception:
            final_summary = f"Synthesized analysis from {len(agent_results)} specialized agents. Identified active hazards and operational logistics constraints in North Eastern Region."

        total_ms = int((time.time() - start) * 1000)

        return {
            "query": query,
            "plan": plan,
            "agent_results": agent_results,
            "final_summary": final_summary,
            "recommendations": all_recommendations,
            "evidence": all_evidence,
            "warnings": all_warnings,
            "total_execution_time_ms": total_ms
        }
