import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const cloudReady = Boolean(url && key);

export const supabase = cloudReady
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

/** Kort beskrivning av ett Supabase-fel som går att visa i UI:t. */
export function describeError(error) {
  if (!error) return "";
  const message = error.message || String(error);
  if (error.code === "42P01" || error.code === "PGRST205" || /could not find the table|relation .* does not exist/i.test(message)) {
    return "Cloud-tabellerna saknas – kör supabase/schema.sql i Supabase.";
  }
  if (error.code === "42501" || /row-level security/i.test(message)) {
    return "RLS blockerade anropet – logga in igen.";
  }
  return message;
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/* ---------------- läsning ---------------- */

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function pullAll() {
  const [projects, chats, messages, skills, mcp, usage] = await Promise.all([
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("chats").select("*").order("created_at"),
    supabase.from("messages").select("*").order("created_at"),
    supabase.from("skills").select("*").order("created_at"),
    supabase.from("mcp_servers").select("*").order("created_at"),
    supabase.from("model_usage").select("*").eq("day", new Date().toISOString().slice(0, 10)),
  ]);

  return {
    projects: unwrap(projects),
    chats: unwrap(chats),
    messages: unwrap(messages),
    skills: unwrap(skills),
    mcp: unwrap(mcp),
    usage: unwrap(usage)[0] ?? null,
  };
}

/* ---------------- skrivning ---------------- */

async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export const db = {
  createProject: (userId, project) =>
    run(
      supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: project.name,
          folder: project.folder ?? null,
          repo: project.repo ?? null,
          startup_script: project.startup ?? "bun install",
        })
        .select()
        .single(),
    ),

  updateProject: (id, patch) =>
    run(
      supabase
        .from("projects")
        .update({
          name: patch.name,
          startup_script: patch.startup,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
    ),

  createChat: (userId, chat) =>
    run(
      supabase
        .from("chats")
        .insert({
          user_id: userId,
          project_id: chat.projectId ?? null,
          title: chat.title,
          scope: chat.scope ?? "chat",
          location: chat.location ?? "local",
        })
        .select()
        .single(),
    ),

  updateChat: (id, patch) =>
    run(
      supabase.from("chats").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id),
    ),

  addMessage: (userId, chatId, message) =>
    run(
      supabase.from("messages").insert({
        user_id: userId,
        chat_id: chatId,
        role: message.role,
        body: message.text,
        model: message.model ?? null,
      }),
    ),

  upsertSkills: (userId, skills) =>
    skills.length
      ? run(
          supabase.from("skills").upsert(
            skills.map((skill) => ({
              user_id: userId,
              name: skill.name,
              description: skill.description ?? "",
              instructions: skill.instructions ?? "",
            })),
            { onConflict: "user_id,name" },
          ),
        )
      : Promise.resolve([]),

  deleteSkill: (userId, name) =>
    run(supabase.from("skills").delete().eq("user_id", userId).eq("name", name)),

  addMcpServer: (userId, server) =>
    run(
      supabase
        .from("mcp_servers")
        .upsert(
          {
            user_id: userId,
            name: server.name,
            config: server.config ?? null,
            status: server.status ?? "needs-approval",
          },
          { onConflict: "user_id,name" },
        )
        .select()
        .single(),
    ),

  saveUsage: (userId, usedHours) =>
    run(
      supabase.from("model_usage").upsert(
        {
          user_id: userId,
          day: new Date().toISOString().slice(0, 10),
          used_hours: Number(usedHours.toFixed(4)),
        },
        { onConflict: "user_id,day" },
      ),
    ),
};
