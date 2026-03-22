import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAMPLE_PEOPLE = [
    { first_name: "Sarah", last_name: "Johnson", status: "member", phone: "+15551234567" },
    { first_name: "David", last_name: "Williams", status: "leader", phone: "+15551234568" },
    { first_name: "Emily", last_name: "Brown", status: "first_time_visitor", phone: "+15551234569" },
    { first_name: "Michael", last_name: "Davis", status: "member", phone: "+15551234570" },
    { first_name: "Jennifer", last_name: "Miller", status: "regular_attender", phone: "+15551234571" },
    { first_name: "James", last_name: "Wilson", status: "member", phone: "+15551234572" },
    { first_name: "Lisa", last_name: "Moore", status: "first_time_visitor", phone: "+15551234573" },
    { first_name: "Robert", last_name: "Taylor", status: "leader", phone: "+15551234574" },
    { first_name: "Amanda", last_name: "Anderson", status: "member", phone: "+15551234575" },
    { first_name: "Daniel", last_name: "Thomas", status: "regular_attender", phone: "+15551234576" },
    { first_name: "Jessica", last_name: "Martinez", status: "member", phone: "+15551234577" },
    { first_name: "Christopher", last_name: "Garcia", status: "first_time_visitor", phone: "+15551234578" },
    { first_name: "Ashley", last_name: "Robinson", status: "member", phone: "+15551234579" },
    { first_name: "Matthew", last_name: "Clark", status: "leader", phone: "+15551234580" },
    { first_name: "Stephanie", last_name: "Lewis", status: "member", phone: "+15551234581" },
];

const SAMPLE_GROUPS = [
    { name: "Youth Group", description: "High school and college students" },
    { name: "Worship Team", description: "Musicians and vocalists" },
    { name: "Prayer Warriors", description: "Dedicated intercessors" },
];

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { organization_id } = await req.json();

        if (!organization_id) {
            return new Response(JSON.stringify({ error: "organization_id required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Seeding demo data for org: ${organization_id}`);

        // 1. Create sample people
        const peopleWithOrg = SAMPLE_PEOPLE.map(p => ({
            ...p,
            organization_id,
            is_demo: true,
            email: `${p.first_name.toLowerCase()}.${p.last_name.toLowerCase()}@demo.churchcomm.app`,
            birthday: randomBirthday(),
        }));

        const { data: people, error: peopleError } = await supabase
            .from("people")
            .insert(peopleWithOrg)
            .select();

        if (peopleError) throw peopleError;
        console.log(`Created ${people.length} demo people`);

        // 2. Create sample groups
        const groupsWithOrg = SAMPLE_GROUPS.map(g => ({
            ...g,
            organization_id,
            is_demo: true,
        }));

        const { data: groups, error: groupsError } = await supabase
            .from("groups")
            .insert(groupsWithOrg)
            .select();

        if (groupsError) throw groupsError;
        console.log(`Created ${groups.length} demo groups`);

        // 3. Add some people to groups
        const groupMembers = [
            { group_id: groups[0].id, person_id: people[0].id, organization_id },
            { group_id: groups[0].id, person_id: people[4].id, organization_id },
            { group_id: groups[1].id, person_id: people[1].id, organization_id },
            { group_id: groups[1].id, person_id: people[7].id, organization_id },
            { group_id: groups[2].id, person_id: people[3].id, organization_id },
        ];

        await supabase.from("group_members").insert(groupMembers);

        // 4. Create sample call history
        const callAttempts = [
            { person_id: people[0].id, status: "completed", duration_seconds: 180 },
            { person_id: people[1].id, status: "completed", duration_seconds: 240 },
            { person_id: people[2].id, status: "no_answer", duration_seconds: 0 },
            { person_id: people[3].id, status: "completed", duration_seconds: 150 },
            { person_id: people[4].id, status: "failed", duration_seconds: 0 },
        ].map(ca => ({
            ...ca,
            organization_id,
            is_demo: true,
            created_at: randomRecentDate(),
        }));

        await supabase.from("call_attempts").insert(callAttempts);
        console.log(`Created ${callAttempts.length} demo call attempts`);

        // 5. Create a resolved escalation
        await supabase.from("escalation_alerts").insert({
            organization_id,
            person_id: people[3].id,
            alert_type: "prayer_request",
            priority: "medium",
            summary: "Member shared they are going through a difficult time at work",
            status: "resolved",
            is_demo: true,
        });

        return new Response(JSON.stringify({
            success: true,
            created: {
                people: people.length,
                groups: groups.length,
                call_attempts: callAttempts.length,
                escalations: 1,
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Seed error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

function randomBirthday(): string {
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `1990-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomRecentDate(): string {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
}
