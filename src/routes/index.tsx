import { createFileRoute } from "@tanstack/react-router";
import JumpGame from "@/components/JumpGame";

export const Route = createFileRoute("/")({
  component: JumpGame,
});
