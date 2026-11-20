"use client";

import { Loader2, RotateCcw, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_LENGTH } from "../conversation";
import type { AssistantChat } from "../hooks/use-assistant-chat";
import { AssistantCardView } from "./assistant-cards";

const SUGGESTIONS = ["Where is my parcel?", "How much to send 2 kg to Kandy?", "Which districts do you deliver to?"];
const ADMIN_SUGGESTIONS = ["Today's report", "This week's report", "This month's report"];

/**
 * The chat inside the assistant sheet: the conversation, suggestions for a first question, and the message box.
 * `signedIn` also offers "Show my parcels" (customers and merchants); `admin` offers the daily, weekly and monthly
 * service reports instead. The chat state lives in the launcher, so closing the sheet doesn't cancel a question.
 */
export function AssistantPanel({ chat, signedIn, admin }: { chat: AssistantChat; signedIn: boolean; admin: boolean }) {
  const { messages, pending, error, send, retry, clear } = chat;
  // An unanswered question (the request failed, or the page was left while waiting) can be asked again.
  const unanswered = !pending && messages.at(-1)?.role === "user";
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const suggestions = admin ? ADMIN_SUGGESTIONS : signedIn ? ["Show my parcels", ...SUGGESTIONS.slice(1)] : SUGGESTIONS;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, pending, error]);

  function submit(text: string) {
    if (!text.trim() || pending) return;
    send(text);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-grey-200 px-4 py-3 pr-14">
        <SheetTitle>Ask SwiftDrop</SheetTitle>
        <SheetDescription className="text-body-sm text-grey-600">
          {admin ? "Service reports, parcels and prices." : "Track a parcel or check a price."} Answers come from
          SwiftDrop&apos;s own records.
        </SheetDescription>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-body-sm text-grey-700">
              {admin
                ? "Hi! I can make a daily, weekly or monthly service report, and you can download it as a CSV file."
                : "Hi! I can tell you where a parcel is, estimate a delivery fee, or list the districts we deliver to."}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button key={suggestion} variant="secondary" className="h-auto py-2" onClick={() => submit(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex flex-col gap-2", message.role === "user" ? "items-end" : "items-start")}
          >
            <p
              className={cn(
                "max-w-[85%] rounded-md px-3 py-2 text-body-sm whitespace-pre-line",
                message.role === "user" ? "bg-grey-100 text-grey-900" : "border border-grey-200 bg-white text-grey-900",
              )}
            >
              <span className="sr-only">{message.role === "user" ? "You: " : "SwiftDrop: "}</span>
              {message.text}
            </p>
            {message.cards?.map((card, index) => (
              <div key={index} className="w-full max-w-[85%]">
                <AssistantCardView card={card} />
              </div>
            ))}
          </div>
        ))}

        {pending ? (
          <p className="flex items-center gap-2 text-body-sm text-grey-600" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Looking that up...
          </p>
        ) : null}

        {unanswered ? (
          <InlineNotice tone="error" title="We couldn't answer that">
            <p>{error ?? "The answer didn't arrive."}</p>
            <Button variant="link" className="mt-1" onClick={retry}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        ) : null}
        <div ref={end} />
      </div>

      <form
        className="space-y-2 border-t border-grey-200 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label htmlFor="assistant-message" className="sr-only">
          Your question
        </label>
        <Textarea
          id="assistant-message"
          rows={2}
          className="min-h-0"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={admin ? "Ask for a report, a parcel or a price" : "Ask about a parcel or a price"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit(draft);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <IconButton label="Clear the chat" variant="tertiary" onClick={clear} disabled={messages.length === 0}>
            <Trash2 />
          </IconButton>
          <span className="ml-auto text-caption text-grey-500 tabular-nums">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <Button type="submit" disabled={pending || !draft.trim()}>
            <Send aria-hidden="true" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
