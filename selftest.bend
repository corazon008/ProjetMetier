# Colis Impossible -- self-test. Every idea's first patch must be refused,
# every fix accepted, and the starting board must be safe.

import Base
import ./main.bend as G

def show_maybe_check(m: Maybe<&2, G.Check>) -> String:
  match m:
    case Some{c}:
      Bool.show(G.check_ok(c))
    case None{}:
      "-"

def show_plan(p: G.Plan) -> String:
  match p:
    case G.ChatPlan{_}:
      "chat"
    case G.LockedPlan{idea}:
      "locked " ++ G.idea_id(idea)
    case G.PatchPlan{idea, _, c1, _, c2, _, accepted}:
      G.idea_id(idea) ++ " c1=" ++ Bool.show(G.check_ok(c1))
        ++ " c2=" ++ show_maybe_check(c2)
        ++ " accepted=" ++ Bool.show(accepted)

def show_submit(s: G.Submit) -> String:
  match s:
    case G.Submit{session, plan, _}:
      +st = G.session_stats(session)
      show_plan(plan) ++ " | prompts=" ++ Nat.show(G.stats_prompts(st))
        ++ " refused=" ++ Nat.show(G.stats_refused(st))
        ++ " merged=" ++ Nat.show(G.stats_merged(st))

def show_move(m: G.MoveOut) -> String:
  match m:
    case G.MoveOut{session, blocked, _, launch, _, _, _}:
      +p = G.session_player(session)
      Bool.show(blocked) ++ " at " ++ Nat.show(G.st_x(p)) ++ ","
        ++ Nat.show(G.st_y(p)) ++ " launch=" ++ Bool.show(launch)

def show_chips(xs: List<&2, G.Chip>) -> String:
  match xs:
    case Nil{}:
      ""
    case h <> t:
      G.chip_id(h) ++ " " ++ show_chips(t)

def test_ideas(xs: List<&2, G.Idea>) -> IO(Unit):
  match xs:
    case Nil{}:
      IO.pure(Unit, Unit{})
    case h <> t:
      do IO<Unit>:
        out : G.Submit = G.submit_id(G.new_session(), G.idea_id(h))
        IO.print(show_submit(out))
        test_ideas(t)

def move_session(m: G.MoveOut) -> G.Session:
  match m:
    case G.MoveOut{session, _, _, _, _, _, _}:
      session

def test_moves() -> IO(Unit):
  do IO<Unit>:
    +s0 : G.Session = G.new_session()
    +m1 : G.MoveOut = G.move(s0, G.Right{})
    IO.print(show_move(m1))
    +m2 : G.MoveOut = G.move(move_session(m1), G.Right{})
    IO.print(show_move(m2))
    +m3 : G.MoveOut = G.move(move_session(m2), G.Up{})
    IO.print(show_move(m3))
    IO.print(show_chips(G.chips(s0)))

def main() -> IO(Unit):
  do IO<Unit>:
    out : G.Submit = G.submit_text(G.new_session(), "Ouvre le portail")
    IO.print(show_submit(out))
    out2 : G.Submit = G.submit_text(G.new_session(), "Bonjour")
    IO.print(show_submit(out2))
    out3 : G.Submit = G.submit_text(G.new_session(), "Ajoute une licorne")
    IO.print(show_submit(out3))
    test_ideas(G.ideas())
    test_moves()
