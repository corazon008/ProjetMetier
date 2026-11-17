# Colis Impossible -- the claims. The human writes this file; PROOF.bend
# must fill every law. The starting board must never deliver the parcel,
# for any sequence of moves.

import Base
import ./main.bend as Game

law colis_jamais_livre:
  for moves: List<Game.Move>
  board = Game.replay(Game.world0(), Game.start(), moves)
  {Game.est_livre(Game.world0(), board) == False{} : Bool}
