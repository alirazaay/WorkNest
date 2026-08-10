import { createPerformanceCycle, getPerformanceCycle, listPerformanceCycles, updatePerformanceCycle } from './performance.service.js';
import { addTemplateCriterion, createCriterion, createTemplate, getTemplate, listCriteria, listTemplates, removeTemplateCriterion, updateCriterion, updateTemplate, updateTemplateCriterion } from './criteria.service.js';
import { createGoal, getGoal, listGoals, updateGoal } from './goals.service.js';
import { createEvidence, listEvidence, verifyEvidence } from './evidence.service.js';
import { createReview, getReview, listReviews, submitReview } from './reviews.service.js';
import { calculateCycleScores, getEmployeeScore } from './score.service.js';
import { createRatingBand, listRatingBands, updateRatingBand } from './rating-bands.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
export async function cyclesList(req, res, next) { try { send(res, await listPerformanceCycles(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function cycleGet(req, res, next) { try { send(res, await getPerformanceCycle(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function cycleCreate(req, res, next) { try { send(res, await createPerformanceCycle(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function cycleUpdate(req, res, next) { try { send(res, await updatePerformanceCycle(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function criteriaList(req, res, next) { try { send(res, await listCriteria(req.auth)); } catch (error) { next(error); } }
export async function criterionCreate(req, res, next) { try { send(res, await createCriterion(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function criterionUpdate(req, res, next) { try { send(res, await updateCriterion(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function templatesList(req, res, next) { try { send(res, await listTemplates(req.auth)); } catch (error) { next(error); } }
export async function templateGet(req, res, next) { try { send(res, await getTemplate(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function templateCreate(req, res, next) { try { send(res, await createTemplate(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function templateUpdate(req, res, next) { try { send(res, await updateTemplate(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function templateCriterionAdd(req, res, next) { try { send(res, await addTemplateCriterion(req.auth, Number(req.params.id), req.validated.body), 201); } catch (error) { next(error); } }
export async function templateCriterionUpdate(req, res, next) { try { send(res, await updateTemplateCriterion(req.auth, Number(req.params.id), Number(req.params.assignmentId), req.validated.body)); } catch (error) { next(error); } }
export async function templateCriterionRemove(req, res, next) { try { send(res, await removeTemplateCriterion(req.auth, Number(req.params.id), Number(req.params.assignmentId))); } catch (error) { next(error); } }
export async function goalsList(req, res, next) { try { send(res, await listGoals(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function employeeGoalsList(req, res, next) { try { send(res, await listGoals(req.auth, { ...req.validated.query, employeeId: Number(req.params.employeeId) })); } catch (error) { next(error); } }
export async function goalGet(req, res, next) { try { send(res, await getGoal(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function goalCreate(req, res, next) { try { send(res, await createGoal(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function goalUpdate(req, res, next) { try { send(res, await updateGoal(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function evidenceList(req, res, next) { try { send(res, await listEvidence(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function employeeEvidenceList(req, res, next) { try { send(res, await listEvidence(req.auth, { ...req.validated.query, employeeId: Number(req.params.employeeId) })); } catch (error) { next(error); } }
export async function evidenceCreate(req, res, next) { try { send(res, await createEvidence(req.auth, req.validated.body, req.file), 201); } catch (error) { if (req.file?.path) await unlink(req.file.path).catch(() => {}); next(error); } }
export async function evidenceVerify(req, res, next) { try { send(res, await verifyEvidence(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function reviewsList(req, res, next) { try { send(res, await listReviews(req.auth, req.validated.query)); } catch (error) { next(error); } }
export async function reviewGet(req, res, next) { try { send(res, await getReview(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function reviewCreate(req, res, next) { try { send(res, await createReview(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function reviewSubmit(req, res, next) { try { send(res, await submitReview(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
export async function employeeScoreGet(req, res, next) { try { send(res, await getEmployeeScore(req.auth, req.validated.query.cycleId, Number(req.params.employeeId))); } catch (error) { next(error); } }
export async function cycleScoresCalculate(req, res, next) { try { send(res, await calculateCycleScores(req.auth, Number(req.params.cycleId))); } catch (error) { next(error); } }
export async function ratingBandsList(req, res, next) { try { send(res, await listRatingBands(req.auth)); } catch (error) { next(error); } }
export async function ratingBandCreate(req, res, next) { try { send(res, await createRatingBand(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function ratingBandUpdate(req, res, next) { try { send(res, await updateRatingBand(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
import { unlink } from 'node:fs/promises';
