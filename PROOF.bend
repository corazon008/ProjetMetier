# Colis Impossible -- the certificate.
#
# The starting board is safe. The invariant: the courier stands on a cell
# that is inside the map, outside the garden, not on a wall, and not on a
# goal. The finite geometry is computed, not argued: chk_all enumerates
# every cell and every move and evaluates to True. The lemmas index that
# certificate at any coordinates, and run_safe carries the invariant
# through any list of moves.

import Base
import ./main.bend as Game
import ./LAWS.bend as Laws

# Proof kit
# ---------

def T(b: Bool) -> Data:
  match b:
    case True{}:
      Unit
    case False{}:
      Empty

def sym(-A: Type, -a: A, -b: A, e: {a == b : A}) -> {b == a : A}:
  %e : {_ == a : A}
  {==}

def and_split(+a: Bool, -b: Bool, w: T(a && b), -P: Type,
  f: T(a) -> T(b) -> P) -> P:
  match a:
    case True{}:
      f(Unit{}, w)
    case False{}:
      Empty.absurd(P, w)

def and_intro(+a: Bool, -b: Bool, wa: T(a), wb: T(b)) -> T(a && b):
  match a:
    case True{}:
      wb
    case False{}:
      Empty.absurd(T(False{} && b), wa)

def not_elim(+a: Bool, wn: T(Bool.not(a)), wa: T(a)) -> Empty:
  match a:
    case True{}:
      wn
    case False{}:
      wa

def imp(a: Bool, b: Bool) -> Bool:
  Bool.not(a) || b

def imp_elim(+a: Bool, -b: Bool, wi: T(imp(a, b)), wa: T(a)) -> T(b):
  match a:
    case True{}:
      wi
    case False{}:
      Empty.absurd(T(b), wa)

def bool_case(+b: Bool, -P: Bool -> Type,
  t: {True{} == b : Bool} -> P(True{}),
  f: {False{} == b : Bool} -> P(False{})) -> P(b):
  match b:
    case True{}:
      t({==})
    case False{}:
      f({==})

def or_case(-A: Type, -B: Type, o: Or(A, B), -P: Type,
  f: A -> P, g: B -> P) -> P:
  match o:
    case Inl{l}:
      f(l)
    case Inr{r}:
      g(r)

def false_eq(+k: Bool, hnk: T(Bool.not(k))) -> {False{} == k : Bool}:
  match k:
    case True{}:
      Empty.absurd({False{} == True{} : Bool}, hnk)
    case False{}:
      {==}

# Nat comparisons, for indexing the certificate
# ---------------------------------------------

def nat_eq(a: Nat, b: Nat) -> Bool:
  match a:
    case 0n:
      match b:
        case 0n:
          True{}
        case 1n+q:
          False{}
    case 1n+p:
      match b:
        case 0n:
          False{}
        case 1n+q:
          nat_eq(p, q)

def nat_le(a: Nat, b: Nat) -> Bool:
  match a:
    case 0n:
      True{}
    case 1n+p:
      match b:
        case 0n:
          False{}
        case 1n+q:
          nat_le(p, q)

def eq_sound(a: Nat, b: Nat, w: T(nat_eq(a, b))) -> {a == b : Nat}:
  match a:
    case 0n:
      match b:
        case 0n:
          {==}
        case 1n+q:
          Empty.absurd({0n == 1n+q : Nat}, w)
    case 1n+p:
      match b:
        case 0n:
          Empty.absurd({1n+p == 0n : Nat}, w)
        case 1n+q:
          %eq_sound(p, q, w) : {1n+p == 1n+_ : Nat}
          {==}

def le_split(a: Nat, b: Nat, w: T(nat_le(a, b)))
  -> Or(T(nat_le(1n+a, b)), {a == b : Nat}):
  match a:
    case 0n:
      match b:
        case 0n:
          Inr{{==}}
        case 1n+q:
          Inl{w}
    case 1n+p:
      match b:
        case 0n:
          Empty.absurd(Or(T(nat_le(2n+p, 0n)), {1n+p == 0n : Nat}), w)
        case 1n+q:
          or_case(T(nat_le(1n+p, q)), {p == q : Nat}, le_split(p, q, w),
            Or(T(nat_le(2n+p, 1n+q)), {1n+p == 1n+q : Nat}),
            l => Inl{l},
            e => Inr{%e : {1n+p == 1n+_ : Nat}
                     {==}})

# The invariant
# -------------

def inbounds(+x: Nat, +y: Nat) -> Bool:
  nat_le(x, 15n) && nat_le(y, 9n)

def room(+x: Nat, +y: Nat) -> Bool:
  nat_le(11n, x) && nat_le(2n, y) && nat_le(y, 7n)

def solid(+x: Nat, +y: Nat) -> Bool:
  Game.solid_tile(Game.tile_at(Game.world0(), x, y))

def goal_at(+x: Nat, +y: Nat) -> Bool:
  Game.goal_at(Game.world0(), Game.St{x, y, False{}})

def okpos(+x: Nat, +y: Nat) -> Bool:
  inbounds(x, y) && (Bool.not(room(x, y)) && Bool.not(solid(x, y)))

def invpos(+x: Nat, +y: Nat) -> Bool:
  okpos(x, y) && Bool.not(goal_at(x, y))

def inv(+s: Game.St) -> Bool:
  invpos(Game.st_x(s), Game.st_y(s)) && Bool.not(Game.st_k(s))

def next_state(a: Game.Move, x: Nat, y: Nat) -> Game.St:
  Game.mr_dest(Game.step(Game.world0(), Game.St{x, y, False{}}, a))

def chk(+a: Game.Move, +x: Nat, +y: Nat) -> Bool:
  imp(inv(Game.St{x, y, False{}}), inv(next_state(a, x, y)))

def chk_row(+a: Game.Move, +x: Nat, y: Nat) -> Bool:
  match y:
    case 0n:
      chk(a, x, 0n)
    case 1n++q:
      chk(a, x, 1n+q) && chk_row(a, x, q)

def chk_all(+a: Game.Move, x: Nat) -> Bool:
  match x:
    case 0n:
      chk_row(a, 0n, 9n)
    case 1n++p:
      chk_row(a, 1n+p, 9n) && chk_all(a, p)

def chk_row_at(+a: Game.Move, +x: Nat, y: Nat, j: Nat,
  wr: T(chk_row(a, x, y)), wj: T(nat_le(j, y))) -> T(chk(a, x, j)):
  match y j:
    case 0n 0n:
      wr
    case 0n 1n+jp:
      Empty.absurd(T(chk(a, x, 1n+jp)), wj)
    case 1n++q 0n:
      and_split(chk(a, x, 1n+q), chk_row(a, x, q), wr, T(chk(a, x, 0n)),
        wp => wt => chk_row_at(a, x, q, 0n, wt, Unit{}))
    case 1n++q 1n++jp:
      and_split(chk(a, x, 1n+q), chk_row(a, x, q), wr, T(chk(a, x, 1n+jp)),
        wp => wt =>
          or_case(T(nat_le(1n+jp, q)), {jp == q : Nat},
            le_split(jp, q, wj), T(chk(a, x, 1n+jp)),
            l => chk_row_at(a, x, q, 1n+jp, wt, l),
            e => %sym(Nat, jp, q, e) : T(chk(a, x, 1n+_))
                 wp))

def chk_all_at(+a: Game.Move, x: Nat, i: Nat, wa: T(chk_all(a, x)),
  wi: T(nat_le(i, x))) -> T(chk_row(a, i, 9n)):
  match x i:
    case 0n 0n:
      wa
    case 0n 1n+ip:
      Empty.absurd(T(chk_row(a, 1n+ip, 9n)), wi)
    case 1n++p 0n:
      and_split(chk_row(a, 1n+p, 9n), chk_all(a, p), wa,
        T(chk_row(a, 0n, 9n)),
        wp => wt => chk_all_at(a, p, 0n, wt, Unit{}))
    case 1n++p 1n++ip:
      and_split(chk_row(a, 1n+p, 9n), chk_all(a, p), wa,
        T(chk_row(a, 1n+ip, 9n)),
        wp => wt =>
          or_case(T(nat_le(1n+ip, p)), {ip == p : Nat},
            le_split(ip, p, wi), T(chk_row(a, 1n+ip, 9n)),
            l => chk_all_at(a, p, 1n+ip, wt, l),
            e => %sym(Nat, ip, p, e) : T(chk_row(a, 1n+_, 9n))
                 wp))

def cert(+a: Game.Move, +x: Nat, +y: Nat, ca: T(chk_all(a, 15n)),
  lx: T(nat_le(x, 15n)), ly: T(nat_le(y, 9n))) -> T(chk(a, x, y)):
  chk_row_at(a, x, 9n, y, chk_all_at(a, 15n, x, ca, lx), ly)

# A safe cell takes a safe, unwon, keyless step
# ---------------------------------------------

def st_eq_false(s: Game.St, hnk: T(Bool.not(Game.st_k(s))))
  -> {s == Game.St{Game.st_x(s), Game.st_y(s), False{}} : Game.St}:
  match s:
    case Game.St{+x, +y, +k}:
      match k:
        case True{}:
          Empty.absurd({Game.St{x, y, True{}} == Game.St{x, y, False{}} : Game.St},
            hnk)
        case False{}:
          {==}

def inv_norm(s: Game.St, h: T(inv(s)))
  -> &x: Nat -> &y: Nat -> T(inv(Game.St{x, y, False{}}))
   & {Game.St{x, y, False{}} == s : Game.St}:
  match s:
    case Game.St{+x, +y, +k}:
      (x, (y,
        and_split(invpos(x, y), Bool.not(k), h,
          T(inv(Game.St{x, y, False{}}))
           & {Game.St{x, y, False{}} == Game.St{x, y, k} : Game.St},
          hp => hnk =>
            (and_intro(invpos(x, y), Bool.not(False{}), hp, Unit{}),
             %false_eq(k, hnk) : {Game.St{x, y, False{}} == Game.St{x, y, _} : Game.St}
             {==}))))

def use_norm(-s: Game.St,
  w: &x: Nat -> &y: Nat -> T(inv(Game.St{x, y, False{}}))
   & {Game.St{x, y, False{}} == s : Game.St},
  -P: Type,
  k: @x: Nat -> @y: Nat -> @hf: T(inv(Game.St{x, y, False{}}))
   -> @eq: {Game.St{x, y, False{}} == s : Game.St} -> P) -> P:
  (x, w1) = w
  (y, w2) = w1
  (hf, eq) = w2
  k(x, y, hf, eq)

def go_ok(+a: Game.Move, +x: Nat, +y: Nat,
  +h: T(inv(Game.St{x, y, False{}})), ca: T(chk_all(a, 15n)))
  -> &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
   & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St}:
  and_split(invpos(x, y), Bool.not(False{}), h,
    &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
     & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St},
    hp => _ =>
      and_split(okpos(x, y), Bool.not(goal_at(x, y)), hp,
        &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
         & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St},
        hok => hg =>
          and_split(inbounds(x, y),
            Bool.not(room(x, y)) && Bool.not(solid(x, y)), hok,
            &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
             & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St},
            hb => hnr =>
              and_split(nat_le(x, 15n), nat_le(y, 9n), hb,
                &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
                 & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St},
                lx => ly =>
                  hnext = imp_elim(inv(Game.St{x, y, False{}}),
                    inv(next_state(a, x, y)),
                    cert(a, x, y, ca, lx, ly), h)
                  use_norm(next_state(a, x, y),
                    inv_norm(next_state(a, x, y), hnext),
                    &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
                     & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St},
                    nx => ny => hf => eqn => (nx, (ny, (hf, eqn))))))))

# The engine: any list of moves keeps the invariant
# -------------------------------------------------

def use4(-a: Game.Move, -x: Nat, -y: Nat,
  w: &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
   & {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St},
  -P: Type,
  k: @nx: Nat -> @ny: Nat -> @hq: T(inv(Game.St{nx, ny, False{}}))
   -> @eq: {Game.St{nx, ny, False{}} == next_state(a, x, y) : Game.St}
   -> P) -> P:
  (nx, w1) = w
  (ny, w2) = w1
  (hq, eq) = w2
  k(nx, ny, hq, eq)

def run_safe(t: List<Game.Move>, +x: Nat, +y: Nat,
  h: T(inv(Game.St{x, y, False{}})))
  -> &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
   & {Game.run(t, Game.world0(), Game.St{x, y, False{}})
      == Game.St{nx, ny, False{}} : Game.St}:
  match t:
    case Nil{}:
      (x, (y, (h, {==})))
    case Game.Up{} <> as0:
      use4(Game.Up{}, x, y, go_ok(Game.Up{}, x, y, h, Unit{}),
        &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
         & {Game.run(as0, Game.world0(), next_state(Game.Up{}, x, y))
            == Game.St{nx, ny, False{}} : Game.St},
        mx => my => hq => eq =>
          %eq : &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
              & {Game.run(as0, Game.world0(), _)
                 == Game.St{nx, ny, False{}} : Game.St}
          run_safe(as0, mx, my, hq))
    case Game.Down{} <> as0:
      use4(Game.Down{}, x, y, go_ok(Game.Down{}, x, y, h, Unit{}),
        &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
         & {Game.run(as0, Game.world0(), next_state(Game.Down{}, x, y))
            == Game.St{nx, ny, False{}} : Game.St},
        mx => my => hq => eq =>
          %eq : &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
              & {Game.run(as0, Game.world0(), _)
                 == Game.St{nx, ny, False{}} : Game.St}
          run_safe(as0, mx, my, hq))
    case Game.Left{} <> as0:
      use4(Game.Left{}, x, y, go_ok(Game.Left{}, x, y, h, Unit{}),
        &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
         & {Game.run(as0, Game.world0(), next_state(Game.Left{}, x, y))
            == Game.St{nx, ny, False{}} : Game.St},
        mx => my => hq => eq =>
          %eq : &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
              & {Game.run(as0, Game.world0(), _)
                 == Game.St{nx, ny, False{}} : Game.St}
          run_safe(as0, mx, my, hq))
    case Game.Right{} <> as0:
      use4(Game.Right{}, x, y, go_ok(Game.Right{}, x, y, h, Unit{}),
        &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
         & {Game.run(as0, Game.world0(), next_state(Game.Right{}, x, y))
            == Game.St{nx, ny, False{}} : Game.St},
        mx => my => hq => eq =>
          %eq : &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
              & {Game.run(as0, Game.world0(), _)
                 == Game.St{nx, ny, False{}} : Game.St}
          run_safe(as0, mx, my, hq))

def use_safe(-t: List<Game.Move>, -x: Nat, -y: Nat,
  w: &nx: Nat -> &ny: Nat -> T(inv(Game.St{nx, ny, False{}}))
   & {Game.run(t, Game.world0(), Game.St{x, y, False{}})
      == Game.St{nx, ny, False{}} : Game.St},
  -P: Type,
  k: @nx: Nat -> @ny: Nat -> @hq: T(inv(Game.St{nx, ny, False{}}))
   -> @eq: {Game.run(t, Game.world0(), Game.St{x, y, False{}})
            == Game.St{nx, ny, False{}} : Game.St}
   -> P) -> P:
  (nx, w1) = w
  (ny, w2) = w1
  (hq, eq) = w2
  k(nx, ny, hq, eq)

# The law, filled
# ---------------

def Laws.colis_jamais_livre(moves):
  use_safe(moves, Game.start_x(), Game.start_y(),
    run_safe(moves, Game.start_x(), Game.start_y(), Unit{}),
    {Game.est_livre(Game.world0(), Game.replay(Game.world0(), Game.start(), moves))
      == False{} : Bool},
    +nx => +ny => hq => eq =>
      %sym(Game.St, Game.run(moves, Game.world0(), Game.St{Game.start_x(),
          Game.start_y(), False{}}), Game.St{nx, ny, False{}}, eq)
        : {Game.est_livre(Game.world0(), _) == False{} : Bool}
      and_split(invpos(nx, ny), Bool.not(False{}), hq,
        {Game.est_livre(Game.world0(), Game.St{nx, ny, False{}})
          == False{} : Bool},
        hp => _ =>
          and_split(okpos(nx, ny), Bool.not(goal_at(nx, ny)), hp,
            {Game.est_livre(Game.world0(), Game.St{nx, ny, False{}})
              == False{} : Bool},
            hok => hg =>
              (sym(Bool, False{}, goal_at(nx, ny), false_eq(goal_at(nx, ny), hg))
                : {Game.est_livre(Game.world0(), Game.St{nx, ny, False{}})
                   == False{} : Bool}))))
