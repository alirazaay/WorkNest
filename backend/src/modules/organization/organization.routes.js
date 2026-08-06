import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { departmentCreateSchema, departmentUpdateSchema, documentUploadSchema, employeeCreateSchema, employeeStatusSchema, employeeUpdateSchema, salarySchema } from './organization.schemas.js';
import { departmentsCreate, departmentsDelete, departmentsList, departmentsUpdate, documentCreate, documentsList, employeesCreate, employeesDelete, employeesGet, employeesList, employeesStatus, employeesUpdate, salaryCreate } from './organization.controller.js';

const uploadRoot = path.resolve('uploads', 'documents');
mkdirSync(uploadRoot, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: uploadRoot, filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype))
});

const router = Router();
router.use(authenticate);

router.get('/departments', authorize('admin', 'manager'), departmentsList);
router.post('/departments', authorize('admin'), validate(departmentCreateSchema), departmentsCreate);
router.patch('/departments/:id', authorize('admin'), validate(departmentUpdateSchema), departmentsUpdate);
router.delete('/departments/:id', authorize('admin'), departmentsDelete);

router.get('/employees', authorize('admin', 'manager'), employeesList);
router.get('/employees/:id', authorize('admin', 'manager'), employeesGet);
router.post('/employees', authorize('admin'), validate(employeeCreateSchema), employeesCreate);
router.patch('/employees/:id', authorize('admin'), validate(employeeUpdateSchema), employeesUpdate);
router.patch('/employees/:id/status', authorize('admin'), validate(employeeStatusSchema), employeesStatus);
router.delete('/employees/:id', authorize('admin'), employeesDelete);
router.post('/employees/:id/salary-structures', authorize('admin'), validate(salarySchema), salaryCreate);
router.post('/employees/:id/documents', authorize('admin'), upload.single('file'), validate(documentUploadSchema, 'body'), documentCreate);
router.get('/employees/:id/documents', authorize('admin', 'manager'), documentsList);

export default router;
