/**
 * Numeric identifiers for all player rule conditions and actions.
 * Mirror of app/Services/PlayerRules.php — the backend sends these IDs;
 * the frontend maps them to i18n keys for human-readable labels.
 */

// Conditions
export const C = {
  HAS_BALL:            1,
  AM_MARKED:           2,
  NEAR_RIVAL:          3,
  BALL_NEAR_MY_GOAL:   4,
  BALL_IN_MY_SIDE:     5,
  BALL_IN_OTHER_SIDE:  6,
  BALL_NEAR_RIVAL_GOAL:7,
  RIVAL_IN_MY_SIDE:    8,
  NO_RIVAL_IN_MY_SIDE: 9,
};

// Actions
export const A = {
  STAY_IN_ZONE:     1,
  GO_TO_BALL:       2,
  GO_TO_NEAR_RIVAL: 3,
  GO_TO_MY_GOAL:    4,
  GO_TO_RIVAL_GOAL: 5,
  GO_FORWARD:       6,
  GO_BACK:          7,
  PASS:             8,
  SHOOT:            9,
  CHANGE_SIDE:      10,
};

/** Maps condition id → i18n key */
export const CONDITION_KEYS = {
  [C.HAS_BALL]:            'cond_has_ball',
  [C.AM_MARKED]:           'cond_am_marked',
  [C.NEAR_RIVAL]:          'cond_near_rival',
  [C.BALL_NEAR_MY_GOAL]:   'cond_ball_near_my_goal',
  [C.BALL_IN_MY_SIDE]:     'cond_ball_in_my_side',
  [C.BALL_IN_OTHER_SIDE]:  'cond_ball_in_other_side',
  [C.BALL_NEAR_RIVAL_GOAL]:'cond_ball_near_rival_goal',
  [C.RIVAL_IN_MY_SIDE]:    'cond_rival_in_my_side',
  [C.NO_RIVAL_IN_MY_SIDE]: 'cond_no_rival_in_my_side',
};

/** Maps action id → i18n key */
export const ACTION_KEYS = {
  [A.STAY_IN_ZONE]:     'act_stay_in_zone',
  [A.GO_TO_BALL]:       'act_go_to_ball',
  [A.GO_TO_NEAR_RIVAL]: 'act_go_to_near_rival',
  [A.GO_TO_MY_GOAL]:    'act_go_to_my_goal',
  [A.GO_TO_RIVAL_GOAL]: 'act_go_to_rival_goal',
  [A.GO_FORWARD]:       'act_go_forward',
  [A.GO_BACK]:          'act_go_back',
  [A.PASS]:             'act_pass',
  [A.SHOOT]:            'act_shoot',
  [A.CHANGE_SIDE]:      'act_change_side',
};

/** Array of { id, key } for conditions — used to populate UI dropdowns */
export const CONDITIONS = Object.entries(CONDITION_KEYS).map(([id, key]) => ({
  id: Number(id),
  key,
}));

/** Array of { id, key } for actions — used to populate UI dropdowns */
export const ACTIONS = Object.entries(ACTION_KEYS).map(([id, key]) => ({
  id: Number(id),
  key,
}));
