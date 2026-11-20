"use client";

import { Check, Copy, KeyRound, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { ListPage } from "@/components/layout/list-page";
import { isApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { merchantApiKeysApi } from "../api";
import type { ApiKey, CreateApiKeyResult } from "../types";

/* ---- State machine ---- */

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "reveal"; keyName: string; rawKey: string }
  | { kind: "revoke"; keyId: string; keyName: string }
  | { kind: "rotate"; keyId: string; keyName: string };

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ApiKey[] };

const COLUMNS = 4;

/** API key management page for merchant users (GET/POST/DELETE /merchant/api-keys). */
export function ApiKeysManager() {
  const [list, setList] = React.useState<ListState>({ status: "loading" });
  const [dialog, setDialog] = React.useState<DialogState>({ kind: "none" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    merchantApiKeysApi
      .list(controller.signal)
      .then((items) => setList({ status: "ready", items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setList({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });
    return () => controller.abort();
  }, [attempt]);

  function addKey(result: CreateApiKeyResult) {
    setList((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            items: [
              { id: result.id, name: result.name, createdAt: result.createdAt, revokedAt: null },
              ...prev.items,
            ],
          }
        : prev,
    );
    setDialog({ kind: "reveal", keyName: result.name, rawKey: result.rawKey });
  }

  function removeKey(id: string) {
    setList((prev) =>
      prev.status === "ready"
        ? { ...prev, items: prev.items.filter((k) => k.id !== id) }
        : prev,
    );
  }

  function markRevoked(id: string) {
    const now = new Date().toISOString();
    setList((prev) =>
      prev.status === "ready"
        ? { ...prev, items: prev.items.map((k) => (k.id === id ? { ...k, revokedAt: now } : k)) }
        : prev,
    );
  }

  return (
    <>
      <ListPage
        title="API keys"
        description="Connect your platform to SwiftDrop using an API key."
        action={
          <Button onClick={() => setDialog({ kind: "create" })}>
            Create API key
          </Button>
        }
      >
        <Card aria-label="API keys">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.status === "loading" ? (
                <TableLoading columns={COLUMNS} label="Loading API keys" />
              ) : list.status === "error" ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="p-6">
                    <div className="flex flex-col gap-4">
                      <InlineNotice tone="error" title="We couldn't load your API keys">
                        {list.message}
                      </InlineNotice>
                      <Button
                        variant="secondary"
                        className="self-start"
                        onClick={() => { setList({ status: "loading" }); setAttempt((n) => n + 1); }}
                      >
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : list.items.length === 0 ? (
                <TableEmpty
                  columns={COLUMNS}
                  icon={KeyRound}
                  title="No API keys yet"
                  description="Create an API key to start sending orders programmatically."
                  action={
                    <Button onClick={() => setDialog({ kind: "create" })}>
                      Create API key
                    </Button>
                  }
                />
              ) : (
                list.items.map((key) => (
                  <KeyRow
                    key={key.id}
                    apiKey={key}
                    onRevoke={() => setDialog({ kind: "revoke", keyId: key.id, keyName: key.name })}
                    onRotate={() => setDialog({ kind: "rotate", keyId: key.id, keyName: key.name })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </ListPage>

      {/* Create key dialog */}
      <CreateKeyDialog
        open={dialog.kind === "create"}
        onClose={() => setDialog({ kind: "none" })}
        onCreated={addKey}
      />

      {/* Reveal (show-once) dialog */}
      <RevealKeyDialog
        open={dialog.kind === "reveal"}
        keyName={dialog.kind === "reveal" ? dialog.keyName : ""}
        rawKey={dialog.kind === "reveal" ? dialog.rawKey : ""}
        onClose={() => setDialog({ kind: "none" })}
      />

      {/* Revoke confirmation */}
      {dialog.kind === "revoke" ? (
        <RevokeDialog
          keyId={dialog.keyId}
          keyName={dialog.keyName}
          onRevoked={() => {
            markRevoked(dialog.keyId);
            setDialog({ kind: "none" });
          }}
          onClose={() => setDialog({ kind: "none" })}
        />
      ) : null}

      {/* Rotate confirmation */}
      {dialog.kind === "rotate" ? (
        <RotateDialog
          keyId={dialog.keyId}
          keyName={dialog.keyName}
          onRotated={(result) => {
            removeKey(dialog.keyId);
            addKey(result);
          }}
          onClose={() => setDialog({ kind: "none" })}
        />
      ) : null}
    </>
  );
}

/* ---- Table row ---- */

function KeyRow({
  apiKey,
  onRevoke,
  onRotate,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
  onRotate: () => void;
}) {
  const isActive = apiKey.revokedAt === null;

  return (
    <TableRow>
      <TableCell>
        <span className="text-label text-grey-900">{apiKey.name}</span>
      </TableCell>
      <TableCell className="tabular-nums text-grey-600">{formatDate(apiKey.createdAt)}</TableCell>
      <TableCell>
        {isActive ? (
          <Badge tone="neutral">Active</Badge>
        ) : (
          <Badge tone="outline">Revoked</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isActive ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`Options for ${apiKey.name}`} variant="tertiary">
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onRotate}>
                <RotateCcw aria-hidden="true" />
                Rotate key
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onRevoke}
                className="text-error focus:bg-error-tint [&_svg]:text-error"
              >
                <Trash2 aria-hidden="true" />
                Revoke key
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

/* ---- Create key dialog ---- */

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: CreateApiKeyResult) => void;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

  function reset() {
    setName("");
    setError(undefined);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name for this key.");
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const result = await merchantApiKeysApi.create(trimmed);
      reset();
      onCreated(result);
    } catch (err) {
      setError(isApiError(err) ? err.message : "We couldn't create the key. Try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give the key a name so you can identify it later, e.g. &ldquo;Production server&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="mt-6">
            <FormField id="key-name" label="Key name" error={error}>
              {(control) => (
                <Input
                  {...control}
                  size="md"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production server"
                  maxLength={100}
                  autoFocus
                />
              )}
            </FormField>
          </DialogBody>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="secondary" type="button" disabled={loading} onClick={() => { reset(); onClose(); }}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={loading}>
              Create key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Reveal (show-once) dialog ---- */

function RevealKeyDialog({
  open,
  keyName,
  rawKey,
  onClose,
}: {
  open: boolean;
  keyName: string;
  rawKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{keyName} created</DialogTitle>
          <DialogDescription>
            Copy this key now — it won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="mt-6">
          <InlineNotice tone="error" title="Save this key before closing">
            Once you close this dialog there is no way to retrieve the key. If you lose it, rotate
            to generate a new one.
          </InlineNotice>
          <div className="flex items-center gap-2 rounded-md border border-grey-200 bg-grey-50 px-4 py-3">
            <code className="min-w-0 flex-1 break-all font-mono text-body-sm text-grey-900">
              {rawKey}
            </code>
            <IconButton
              label={copied ? "Copied" : "Copy key"}
              variant="secondary"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? <Check className="text-success" /> : <Copy />}
            </IconButton>
          </div>
        </DialogBody>
        <DialogFooter className="mt-6">
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Revoke dialog ---- */

function RevokeDialog({
  keyId,
  keyName,
  onRevoked,
  onClose,
}: {
  keyId: string;
  keyName: string;
  onRevoked: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleRevoke() {
    setLoading(true);
    setError(undefined);
    try {
      await merchantApiKeysApi.revoke(keyId);
      onRevoked();
    } catch (err) {
      setError(isApiError(err) ? err.message : "We couldn't revoke the key. Try again.");
      setLoading(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(next) => { if (!next && !loading) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke {keyName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Any application using this key will immediately lose access. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <InlineNotice tone="error" title="We couldn't revoke the key">
            {error}
          </InlineNotice>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={loading} onClick={onClose}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="danger" loading={loading} onClick={handleRevoke}>
              Revoke key
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---- Rotate dialog ---- */

function RotateDialog({
  keyId,
  keyName,
  onRotated,
  onClose,
}: {
  keyId: string;
  keyName: string;
  onRotated: (result: CreateApiKeyResult) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleRotate() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await merchantApiKeysApi.rotate(keyId);
      onRotated(result);
    } catch (err) {
      setError(isApiError(err) ? err.message : "We couldn't rotate the key. Try again.");
      setLoading(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(next) => { if (!next && !loading) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate {keyName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The current key stops working immediately. You&apos;ll get a new key to copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <InlineNotice tone="error" title="We couldn't rotate the key">
            {error}
          </InlineNotice>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={loading} onClick={onClose}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button loading={loading} onClick={handleRotate}>
              Rotate key
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
