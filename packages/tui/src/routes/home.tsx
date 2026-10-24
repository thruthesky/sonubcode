import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, For, onMount, Show, untrack } from "solid-js"
import { mark } from "../logo"
import { useTuiApp, useTuiPaths } from "../context/runtime"
import { abbreviateHome } from "../runtime"
import { RGBA, TextAttributes } from "@opentui/core"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { useEditorContext } from "../context/editor"
import { useData } from "../context/data"
import { useLocation } from "../context/location"
import { FormPrompt } from "./session/form"
import { Slot } from "../plugin/render"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useUpdateNotification } from "../context/update-notification"
import { useExit } from "../context/exit"
import { FadeInText } from "../component/fade-in-text"

let once = false
const placeholder = {
  normal: ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"],
  shell: ["ls -la", "git status", "pwd"],
}

export function Home() {
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const data = useData()
  const location = useLocation()
  const dimensions = useTerminalDimensions()
  // Global MCP elicitations can arrive without a session route, so keep them reachable from Home.
  const currentLocation = () => route.location ?? data.location.default()
  const forms = createMemo(() => data.session.form.list("global", currentLocation()) ?? [])
  let sent = false

  // Track only the route location and (when absent) the default location; location.set
  // reads other signals internally and tracking them would re-assert the route location
  // after the user overrides it with /cd.
  createEffect(() => {
    const target = currentLocation()
    untrack(() => location.set(target))
  })

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r || route.prompt || !args.prompt) return
    r.set({ text: args.prompt, files: [], agents: [], pasted: [] })
    once = true
  }

  createEffect(() => {
    const composer = ref()
    const prompt = route.prompt
    if (!composer || prompt?.text === undefined) return
    untrack(() => composer.set(prompt))
  })

  // Wait for everything submit needs before auto-submitting --prompt; it runs once.
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!local.model.ready || !local.model.catalogReady) return
    if (!local.agent.current() || !local.model.current()) return
    if (!args.prompt) return
    if (r.current.text !== args.prompt) return
    sent = true
    r.submit()
  })

  // Sonub Code — a header like Claude Code's at the top left (mark · name and version · model · folder), the model note under it,
  // the prompt at the bottom
  return (
    <>
      <box
        flexGrow={1}
        alignItems="flex-start"
        paddingTop={1}
        paddingLeft={dimensions().width < 44 ? 1 : 2}
        paddingRight={dimensions().width < 44 ? 1 : 2}
      >
        <HomeHeader />
        <box height={1} flexShrink={0} />
        <HomeNote />
        <UpdateNotification width={dimensions().width} />
        <box flexGrow={1} minHeight={0} />
        <box width="100%" zIndex={1000} flexShrink={0} position="relative">
          <Prompt ref={bind} placeholders={placeholder} disabled={forms().length > 0} />
        </box>
      </box>
      <box width="100%" flexShrink={0}>
        <Slot path="home.footer" />
      </box>
      <Show when={forms()[0]?.id} keyed>
        {(_) => {
          const form = forms()[0]
          return form ? (
            <box position="absolute" zIndex={2000} left={0} right={0} bottom={1} paddingLeft={2} paddingRight={2}>
              <box width="100%">
                <FormPrompt form={form} />
              </box>
            </box>
          ) : null
        }}
      </Show>
    </>
  )
}

// SONUB brand purple (sonub-design: default theme)
const BRAND = RGBA.fromHex("#6551a8")

// Claude Code style header: the mark on the left, three lines on the right — name and version, model · provider, working folder
function HomeHeader() {
  const app = useTuiApp()
  const paths = useTuiPaths()
  const local = useLocal()
  const theme = useTheme()
  const location = useLocation()
  const data = useData()
  const dimensions = useTerminalDimensions()
  const folder = createMemo(() => {
    const directory = location.ref?.directory ?? data.location.default()?.directory
    return directory ? abbreviateHome(directory, paths.home) : ""
  })
  const model = createMemo(() => {
    const parsed = local.model.parsed()
    return parsed.provider ? `${parsed.model} · ${parsed.provider}` : parsed.model
  })
  return (
    <box flexDirection="row" gap={2} flexShrink={0}>
      <Show when={dimensions().width >= 44}>
        <box flexShrink={0}>
          <For each={mark}>
            {(line) => (
              <text fg={BRAND} selectable={false}>
                {line}
              </text>
            )}
          </For>
        </box>
      </Show>
      <box flexShrink={1} minWidth={0}>
        <text fg={theme.text.base} wrapMode="none" truncate>
          <span style={{ attributes: TextAttributes.BOLD }}>Sonub Code</span>
          <span style={{ fg: theme.text.muted }}> v{app.version}</span>
        </text>
        <text fg={theme.text.muted} wrapMode="none" truncate>
          {model()}
        </text>
        <text fg={theme.text.muted} wrapMode="none" truncate>
          {folder()}
        </text>
      </box>
    </box>
  )
}

// Under the header: the default model and /models. The sandbox manager sets SONUBCODE_HOME_NOTE in the member's language
// (lines split by \n); without it the note is built from the current model.
function HomeNote() {
  const local = useLocal()
  const theme = useTheme()
  const lines = createMemo(() => {
    const note = process.env.SONUBCODE_HOME_NOTE?.trim()
    if (note) return note.split("\n")
    return [`Sonub Code uses ${local.model.parsed().model} by default.`, "Type /models to choose another model."]
  })
  const dimensions = useTerminalDimensions()
  // lines up with the header text, right of the mark (10 wide + gap 2)
  return (
    <box flexShrink={0} paddingBottom={1} paddingLeft={dimensions().width >= 44 ? 12 : 0}>
      <For each={lines()}>
        {(line) => {
          // "/models" stands out, like "/update" in the update notice
          const at = line.indexOf("/models")
          return (
            <text fg={theme.text.muted} wrapMode="word">
              {at < 0 ? line : line.slice(0, at)}
              <Show when={at >= 0}>
                <span style={{ fg: theme.text.action.primary.selected }}>/models</span>
                {line.slice(at + "/models".length)}
              </Show>
            </text>
          )
        }}
      </For>
    </box>
  )
}

function UpdateNotification(props: { width: number }) {
  const update = useUpdateNotification()
  const exit = useExit()
  const theme = useTheme()
  const [hovered, setHovered] = createSignal(false)
  const backdrop = () => (hovered() ? theme.background.action.primary.hovered : theme.background.base)
  createEffect(() => {
    update.notification()
    setHovered(false)
  })

  return (
    <Show when={update.notification()} keyed>
      {(state) => {
        const remote = state.source === "server" && state.remote
        return (
          <Show when={!remote || state.type === "available"}>
            <box
              flexShrink={0}
              flexDirection="row"
              justifyContent="center"
              width={props.width}
              maxWidth="100%"
              gap={1}
              backgroundColor={hovered() ? theme.background.action.primary.hovered : undefined}
              onMouseOver={() => setHovered(true)}
              onMouseOut={() => setHovered(false)}
              onMouseUp={() => {
                if (remote) return update.dismiss()
                if (state.type === "installed") return exit()
                update.open?.("notification")
              }}
            >
              <FadeInText fg={theme.text.muted} backdrop={backdrop()}>
                <Show when={!remote}>
                  <span style={{ fg: theme.text.action.primary.selected }}>
                    {state.type === "installed" ? "/exit" : "/update"}
                  </span>
                </Show>
                {remote
                  ? "remote server update available"
                  : state.type === "installed"
                    ? ` restart to use v${state.version}`
                    : ` to install v${state.version}`}
              </FadeInText>
            </box>
          </Show>
        )
      }}
    </Show>
  )
}
