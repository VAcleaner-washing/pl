(()=>{
  'use strict';
  const CORE=window.VACLEANER_CORE;
  if(!CORE?.products||!CORE?.catalog?.products)return;

  const code='puzzi_jimmy_abir';
  const base=CORE.products.puzzi_jimmy;
  const robot=CORE.products.abir;
  if(!base||!robot)return;

  const weekday=Math.max(0,Number(base.weekday)||0)+Math.max(0,Number(robot.weekday)||0);
  const weekend=Math.max(0,Number(base.weekend)||0)+Math.max(0,Number(robot.weekend)||0);
  const product={
    label:'Puzzi + Jimmy + робот',
    shortLabel:'Puzzi + Jimmy + робот',
    category:'Комплект',
    description:'Миючий Puzzi + пиловий Jimmy + робот для вікон. Вартість = тариф Puzzi + Jimmy + тариф робота.',
    weekday,
    weekend,
    resources:{puzzi:1,jimmy:1,abir:1},
    depositGroup:'general',
    imageKeys:['puzzi','jimmy','abir'],
    adminOnly:true,
    aliases:['Puzzi + Jimmy + робот','Миючий + пиловий + робот','Puzzi + Jimmy + ABIR']
  };

  CORE.products[code]=product;
  CORE.catalog.products[code]=product;
  for(const label of [product.label,product.shortLabel,...product.aliases])CORE.productAliases[label]=code;
})();
