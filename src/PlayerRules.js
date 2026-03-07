/**
 * Numeric identifiers for all player rule conditions and actions.
 * Mirror of app/Services/PlayerRules.php — the backend sends these IDs;
 * the frontend is responsible for mapping them to human-readable labels.
 */

// Conditions
export const C = {
  HAS_BALL:            1,  // "I has the ball"
  AM_MARKED:           2,  // "I am marked"
  NEAR_RIVAL:          3,  // "I am near a rival"
  BALL_NEAR_MY_GOAL:   4,  // "The ball is near my goal"
  BALL_IN_MY_SIDE:     5,  // "The ball is in my side"
  BALL_IN_OTHER_SIDE:  6,  // "The ball is in other side"
  BALL_NEAR_RIVAL_GOAL:7,  // "The ball is near rival goal"
  RIVAL_IN_MY_SIDE:    8,  // "Rival in my side"
  NO_RIVAL_IN_MY_SIDE: 9,  // "No rival in my side"
};

// Actions
export const A = {
  STAY_IN_ZONE:     1,   // "Stay in my zone"
  GO_TO_BALL:       2,   // "Go to the ball"
  GO_TO_NEAR_RIVAL: 3,   // "Go to near rival"
  GO_TO_MY_GOAL:    4,   // "Go to my goal"
  GO_TO_RIVAL_GOAL: 5,   // "Go to rival goal"
  GO_FORWARD:       6,   // "Go forward"
  GO_BACK:          7,   // "Go back"
  PASS:             8,   // "Pass the ball"
  SHOOT:            9,   // "Shoot to goal"
  CHANGE_SIDE:      10,  // "Change side"
};

export const CONDITION_LABELS = {
  [C.HAS_BALL]:            "I has the ball",
  [C.AM_MARKED]:           "I am marked",
  [C.NEAR_RIVAL]:          "I am near a rival",
  [C.BALL_NEAR_MY_GOAL]:   "The ball is near my goal",
  [C.BALL_IN_MY_SIDE]:     "The ball is in my side",
  [C.BALL_IN_OTHER_SIDE]:  "The ball is in other side",
  [C.BALL_NEAR_RIVAL_GOAL]:"The ball is near rival goal",
  [C.RIVAL_IN_MY_SIDE]:    "Rival in my side",
  [C.NO_RIVAL_IN_MY_SIDE]: "No rival in my side",
};

export const ACTION_LABELS = {
  [A.STAY_IN_ZONE]:     "Stay in my zone",
  [A.GO_TO_BALL]:       "Go to the ball",
  [A.GO_TO_NEAR_RIVAL]: "Go to near rival",
  [A.GO_TO_MY_GOAL]:    "Go to my goal",
  [A.GO_TO_RIVAL_GOAL]: "Go to rival goal",
  [A.GO_FORWARD]:       "Go forward",
  [A.GO_BACK]:          "Go back",
  [A.PASS]:             "Pass the ball",
  [A.SHOOT]:            "Shoot to goal",
  [A.CHANGE_SIDE]:      "Change side",
};

/** Array of { id, label } for conditions — used to populate UI dropdowns */
export const CONDITIONS = Object.entries(CONDITION_LABELS).map(([id, label]) => ({
  id: Number(id),
  label,
}));

/** Array of { id, label } for actions — used to populate UI dropdowns */
export const ACTIONS = Object.entries(ACTION_LABELS).map(([id, label]) => ({
  id: Number(id),
  label,
}));
