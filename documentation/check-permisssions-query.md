## 1 Lihat role + permission efektif per USER_ID (via user_roles)
SELECT
  u.id AS user_id,
  u.email,
  r.id AS role_id,
  r.name AS role_name,
  p.action,
  p.resource,
  p.name AS permission_name
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE u.id = 'PUT_USER_ID_HERE'
  AND u.deleted_at IS NULL
  AND ur.deleted_at IS NULL
  AND r.deleted_at IS NULL
  AND r.is_active = TRUE
  AND rp.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY r.name, p.resource, p.action;


## 2 Lihat permission dari ROLE_ID tertentu
SELECT
  r.id AS role_id,
  r.name AS role_name,
  p.action,
  p.resource,
  p.name AS permission_name
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.id = 'PUT_ROLE_ID_HERE'
  AND r.deleted_at IS NULL
  AND r.is_active = TRUE
  AND rp.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY p.resource, p.action;

## -- 3) Lihat permission dari ROLE_NAME (mis. ADMIN)
SELECT
  r.name AS role_name,
  p.action,
  p.resource
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'ADMIN'
  AND r.deleted_at IS NULL
  AND r.is_active = TRUE
  AND rp.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY p.resource, p.action;

## -- 4) Cek cepat apakah user punya akses Sales/Purchase Order
SELECT
  u.id AS user_id,
  u.email,
  p.action,
  p.resource,
  CASE WHEN p.id IS NOT NULL THEN 'YES' ELSE 'NO' END AS has_permission
FROM users u
JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.is_active = TRUE
JOIN role_permissions rp ON rp.role_id = r.id AND rp.deleted_at IS NULL
JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
WHERE u.id = 'PUT_USER_ID_HERE'
  AND p.resource IN ('SALES_ORDER', 'PURCHASE_ORDER')
ORDER BY p.resource, p.action;


## -- 5) Cek user punya role di user_roles atau cuma users.role_id saja
SELECT
  u.id AS user_id,
  u.email,
  u.role_id AS users_role_id,
  ur.role_id AS user_roles_role_id,
  r1.name AS users_role_name,
  r2.name AS user_roles_role_name
FROM users u
LEFT JOIN roles r1 ON r1.id = u.role_id
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
LEFT JOIN roles r2 ON r2.id = ur.role_id
WHERE u.id = 'PUT_USER_ID_HERE';

## -- ganti USER_ID_DARI_TOKEN, ACTION, RESOURCE sesuai endpoint yg gagal
SELECT EXISTS (
  SELECT 1
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  INNER JOIN role_permissions rp ON rp.role_id = r.id
  INNER JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = 'USER_ID_DARI_TOKEN'
    AND ur.deleted_at IS NULL
    AND r.deleted_at IS NULL
    AND r.is_active = TRUE
    AND rp.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND p.action = 'READ'
    AND p.resource = 'PURCHASE_ORDER'
) AS has_permission;


