/** Compact site today ↔ physical expansion tomorrow: a decision that is not a storage type. Copy from the prototype. */
export function GrainDevelopmentExplorer() {
  return (
    <div className="planner-development">
      <div className="planner-development-head">
        <p>Окреме рішення, яке не зводиться до типу сховища</p>
        <h3>Компактний майданчик сьогодні <i aria-hidden="true">↔</i><span className="planner-sr-only">і</span> фізичне розширення завтра</h3>
        <span>Потребу в розширенні підтверджено, але можливість резервування території визначається лише після перевірки майданчика.</span>
      </div>
      <ol className="planner-development-grid">
        <li><span aria-hidden="true">А</span><h4>Під поточну потребу</h4><p>Перша черга формується навколо поточної задачі без припущення, що резерв території вже існує.</p></li>
        <li className="is-emphasis"><span aria-hidden="true">Б</span><h4>Перша черга + перевірений резерв</h4><p>Цей шлях можна розглядати, лише якщо межі ділянки підтвердять місце для наступного етапу.</p></li>
        <li><span aria-hidden="true">В</span><h4>Від майбутньої структури назад</h4><p>Майбутня схема стає гіпотезою для проєктування, а не автоматичним висновком планувальника.</p></li>
      </ol>
    </div>
  );
}
