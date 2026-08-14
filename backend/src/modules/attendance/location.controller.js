import { createLocation, deleteLocation, listLocations, updateLocation } from './location.service.js';

const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
export async function locationsListHandler(req, res, next) { try { send(res, await listLocations(req.auth)); } catch (error) { next(error); } }
export async function locationCreateHandler(req, res, next) { try { send(res, await createLocation(req.auth, req.validated.body), 201); } catch (error) { next(error); } }
export async function locationUpdateHandler(req, res, next) { try { send(res, await updateLocation(req.auth, Number(req.params.id), req.validated.body)); } catch (error) { next(error); } }
export async function locationDeleteHandler(req, res, next) { try { send(res, await deleteLocation(req.auth, Number(req.params.id))); } catch (error) { next(error); } }
