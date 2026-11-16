import { Check, Plus } from "lucide-react";
import { Button } from "../actions/button";

export interface FollowButtonProps {
  following: boolean;
  onFollowingChange?: (following: boolean) => void;
  /** Die Änderung wird gerade gespeichert; weitere Klicks bleiben ohne Wirkung. */
  pending?: boolean;
  /** Zum Beispiel `{ follow: "Folgen", following: "Gefolgt" }`. */
  labels: { follow: string; following: string };
  disabled?: boolean;
  className?: string;
}

/** «Folgen» und «Gefolgt» als Umschalter mit Icon und Wort. Es gibt bewusst keinen Follower-Zähler (PRD 12.3). */
export function FollowButton({ following, onFollowingChange, pending, labels, disabled, className }: FollowButtonProps) {
  return (
    <Button
      variant={following ? "quiet" : "secondary"}
      aria-pressed={following}
      loading={pending}
      disabled={disabled}
      icon={following ? <Check aria-hidden strokeWidth={1.5} /> : <Plus aria-hidden strokeWidth={1.5} />}
      className={className}
      onClick={() => onFollowingChange?.(!following)}
    >
      {following ? labels.following : labels.follow}
    </Button>
  );
}
