DELETE FROM user_roles 
WHERE role = 'admin' 
AND user_id IN (
  '58dd7b3c-5844-4177-baf0-2ef09714aa2a',
  '19c4c328-0627-482f-b787-47b5928e702f',
  'c148f8fe-000d-4cbf-be57-159dbdad29f5',
  '21aa0988-c5ea-4961-9884-36d2a69b24c1'
);