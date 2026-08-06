import { Tenant } from './Tenant.js';
import { TenantSetting } from './TenantSetting.js';
import { User } from './User.js';
import { UserSession } from './UserSession.js';
import { Invitation } from './Invitation.js';
import { PasswordResetToken } from './PasswordResetToken.js';

Tenant.hasOne(TenantSetting, { foreignKey: 'tenantId', as: 'settings' });
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
Tenant.hasMany(UserSession, { foreignKey: 'tenantId', as: 'sessions' });
Tenant.hasMany(Invitation, { foreignKey: 'tenantId', as: 'invitations' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
User.hasMany(PasswordResetToken, { foreignKey: 'userId', as: 'passwordResetTokens' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Invitation.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Invitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { Tenant, TenantSetting, User, UserSession, Invitation, PasswordResetToken };
